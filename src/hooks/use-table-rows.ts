"use client";

import { useState } from "react";

export const useTableRows = <T extends { id: number | string }>(
  initialRows: T[],
  rowFactory: (id: number) => T
) => {
  const [rows, setRows] = useState<T[]>(() => initialRows);

  const addRow = () => {
    setRows((prevRows) => [...prevRows, rowFactory(prevRows.length + 1)]);
  };

  const removeRow = (id: number | string) => {
    setRows((prevRows) => prevRows.filter((row) => row.id !== id));
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
  return { rows, setRows, addRow, removeRow, handleInputChange, updateRowValue };
};