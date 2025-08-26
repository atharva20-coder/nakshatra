"use client";

import { useState } from "react";

export const useTableRows = <T extends { id: number | string }>(
  initialRows: T[],
  rowFactory: (id: number) => T
) => {
  // Initialize state only once with the initialRows from the first render
  // by passing a function to useState. This prevents the state from being
  // reset on subsequent re-renders of the parent component.
  const [rows, setRows] = useState<T[]>(() => initialRows);

  const addRow = () => {
    setRows((prevRows) => [...prevRows, rowFactory(prevRows.length + 1)]);
  };

  const handleInputChange = (
    id: number | string,
    field: keyof T,
    value: string
  ) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const updateRowValue = (
    id: number | string,
    field: keyof T,
    value: string
  ) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  return { rows, setRows, addRow, handleInputChange, updateRowValue };
};