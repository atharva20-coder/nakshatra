"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

/**
 * A custom hook to manage table rows with automatic persistence and optimistic updates.
 * It handles fetching data, adding new rows, auto-saving changes, and manual saves.
 * @param tableName - The name of the database table to interact with.
 * @param rowFactory - A function that creates a new, empty row object.
 * @param autoSaveDelay - Delay in milliseconds before auto-saving changes (default: 2000ms)
 * @returns An object with the rows, loading state, and functions to manipulate the table.
 */
export const useTableRows = <T extends { id: number; dbId?: string }>(
  tableName: string,
  rowFactory: (id: number) => T,
  autoSaveDelay: number = 2000
) => {
  const [rows, setRows] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  
  // Use refs to track timeouts and prevent stale closures
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stableRowFactory = useCallback(rowFactory, []);

  // Fetch existing data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/${tableName}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data for ${tableName}`);
        }
        
        type DbRecord = { id: string; [key: string]: unknown };
        const data: DbRecord[] = await response.json();

        const initialRows = data.map((item: DbRecord, index: number) => ({
          ...item,
          id: index + 1, // Local ID for React keys
          dbId: item.id, // Actual ID from the database
        })) as T[];

        setRows(initialRows.length > 0 ? initialRows : [stableRowFactory(1)]);
      } catch (error) {
        console.error(`Error fetching ${tableName}:`, error);
        toast.error(`Could not fetch data for ${tableName}.`);
        setRows([stableRowFactory(1)]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tableName, stableRowFactory]);

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (pendingChanges.size === 0) return;

    setIsSaving(true);
    const changedRowIds = Array.from(pendingChanges);
    const rowsToSave = rows.filter(row => 
      changedRowIds.includes(row.id) && !row.dbId
    );

    if (rowsToSave.length === 0) {
      setPendingChanges(new Set());
      setIsSaving(false);
      return;
    }

    try {
      const savePromises = rowsToSave.map(async (row) => {
        const { id, dbId, ...dataToSend } = row;
        
        const response = await fetch(`/api/${tableName}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save data");
        }

        const savedData = await response.json();
        return { localId: row.id, dbId: savedData.id };
      });

      const savedResults = await Promise.all(savePromises);

      // Update rows with database IDs
      setRows(prevRows =>
        prevRows.map(row => {
          const savedResult = savedResults.find(result => result.localId === row.id);
          return savedResult ? { ...row, dbId: savedResult.dbId } : row;
        })
      );

      // Clear pending changes for successfully saved rows
      setPendingChanges(prev => {
        const newSet = new Set(prev);
        rowsToSave.forEach(row => newSet.delete(row.id));
        return newSet;
      });

      if (rowsToSave.length > 0) {
        toast.success(`Auto-saved ${rowsToSave.length} record(s)`);
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
      toast.error("Auto-save failed. Your changes are still preserved locally.");
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, rows, tableName]);

  // Set up auto-save timer
  useEffect(() => {
    if (pendingChanges.size > 0) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set new timeout
      saveTimeoutRef.current = setTimeout(() => {
        autoSave();
      }, autoSaveDelay);
    }

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pendingChanges, autoSave, autoSaveDelay]);

  const addRow = () => {
    setRows((prevRows) => {
      const newRowId = prevRows.length + 1;
      const newRow = stableRowFactory(newRowId);
      
      // Mark new row as having pending changes
      setPendingChanges(prev => new Set(prev).add(newRowId));
      
      return [...prevRows, newRow];
    });
  };

  const handleInputChange = (
    id: number,
    field: keyof Omit<T, "id" | "dbId">,
    value: string
  ) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );

    // Mark row as having pending changes
    setPendingChanges(prev => new Set(prev).add(id));
  };

  const updateRowValue = (
    id: number,
    field: keyof Omit<T, "id" | "dbId">,
    value: string
  ) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );

    // Mark row as having pending changes
    setPendingChanges(prev => new Set(prev).add(id));
  };

  // Manual save function (for immediate saves)
  const saveRow = async (rowToSave: T) => {
    const originalRows = [...rows];
    
    try {
      const { id, dbId, ...dataToSend } = rowToSave;

      const response = await fetch(`/api/${tableName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save data");
      }

      const savedData = await response.json();

      // Update the row with the actual database ID
      setRows((prevRows) =>
        prevRows.map((row) =>
          row.id === rowToSave.id ? { ...row, dbId: savedData.id } : row
        )
      );

      // Remove from pending changes
      setPendingChanges(prev => {
        const newSet = new Set(prev);
        newSet.delete(rowToSave.id);
        return newSet;
      });

      toast.success("Data saved successfully!");
      return savedData;
    } catch (error) {
      // Revert UI on failure
      setRows(originalRows);
      if (error instanceof Error) {
        toast.error(`Failed to save data: ${error.message}`);
      } else {
        toast.error("An unknown error occurred while saving data.");
      }
      throw error;
    }
  };

  // Manual save all function
  const saveAllPendingChanges = async () => {
    if (pendingChanges.size === 0) {
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);
    const changedRowIds = Array.from(pendingChanges);
    const rowsToSave = rows.filter(row => 
      changedRowIds.includes(row.id) && !row.dbId
    );

    try {
      await Promise.all(rowsToSave.map(row => saveRow(row)));
      toast.success(`Saved ${rowsToSave.length} record(s) successfully!`);
    } catch (error) {
      // Individual saveRow calls handle their own error toasts
    } finally {
      setIsSaving(false);
    }
  };

  // Force save all unsaved rows (including those with dbId)
  const saveAll = async () => {
    setIsSaving(true);
    const unsavedRows = rows.filter(row => !row.dbId);
    
    if (unsavedRows.length === 0) {
      toast.info("All data is already saved");
      setIsSaving(false);
      return;
    }

    try {
      await Promise.all(unsavedRows.map(row => saveRow(row)));
      toast.success(`Saved ${unsavedRows.length} record(s) successfully!`);
    } catch (error) {
      // Individual saveRow calls handle their own error toasts
    } finally {
      setIsSaving(false);
    }
  };

  return { 
    rows, 
    addRow, 
    handleInputChange, 
    updateRowValue, 
    saveRow, 
    saveAll,
    saveAllPendingChanges,
    isLoading,
    isSaving,
    pendingChanges: pendingChanges.size,
    hasPendingChanges: pendingChanges.size > 0
  };
};