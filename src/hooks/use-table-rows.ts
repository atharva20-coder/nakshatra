// src/hooks/use-table-rows.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

/**
 * A custom hook to manage table rows with optimistic updates.
 * It handles fetching data, adding new rows, and saving data to the backend.
 * @param tableName - The name of the database table to interact with.
 * @param rowFactory - A function that creates a new, empty row object.
 * @returns An object with the rows, loading state, and functions to manipulate the table.
 */
export const useTableRows = <T extends { id: number; dbId?: string }>(
  tableName: string,
  rowFactory: (id: number) => T
) => {
  const [rows, setRows] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const stableRowFactory = useCallback(rowFactory, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/${tableName}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data for ${tableName}`);
        }
        // Define a base type for records coming from the database.
        type DbRecord = { id: string; [key: string]: unknown };
        const data: DbRecord[] = await response.json();

        const initialRows = data.map((item: DbRecord, index: number) => ({
          ...item,
          id: index + 1, // Local ID for React keys
          dbId: item.id, // Actual ID from the database
        })) as T[]; // A cast is necessary here, but we've removed `any` from the map.

        setRows(initialRows.length > 0 ? initialRows : [stableRowFactory(1)]);
      } catch (error) {
        toast.error(`Could not fetch data for ${tableName}.`);
        setRows([stableRowFactory(1)]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tableName, stableRowFactory]);

  const addRow = () => {
    setRows((prevRows) => [...prevRows, stableRowFactory(prevRows.length + 1)]);
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
  };

  const saveRow = async (rowToSave: T) => {
    const originalRows = [...rows];
    const tempRow = { ...rowToSave };

    // Optimistically update the UI
    setRows((prevRows) =>
      prevRows.map((row) => (row.id === tempRow.id ? tempRow : row))
    );

    try {
      const { id, dbId, ...dataToSend } = tempRow;

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

      // Update the row with the actual database ID from the response
      setRows((prevRows) =>
        prevRows.map((row) =>
          row.id === tempRow.id ? { ...row, dbId: savedData.id } : row
        )
      );

      toast.success("Data saved successfully!");
    } catch (error) {
      // Revert UI on failure
      setRows(originalRows);
      if (error instanceof Error) {
        toast.error(`Failed to save data: ${error.message}`);
      } else {
        toast.error("An unknown error occurred while saving data.");
      }
    }
  };

  return { rows, addRow, handleInputChange, updateRowValue, saveRow, isLoading };
};