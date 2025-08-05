"use client";

import { useState } from "react";

// The hook now uses a generic type `T`.
// We add a constraint `T extends { id: number }` so we know each row has a unique id for React keys.
export const useTableRows = <T extends { id: number }>(
  initialRowCount: number,
  rowFactory: (id: number) => T // A function to create a new row is now required.
) => {
  const [rows, setRows] = useState<T[]>(() =>
    Array.from({ length: initialRowCount }, (_, i) => rowFactory(i + 1))
  );

  const addRow = () => {
    setRows((prevRows) => [...prevRows, rowFactory(prevRows.length + 1)]);
  };

  // The field is now of type `keyof T`, making it type-safe for any object shape.
  const handleInputChange = (
    id: number,
    field: keyof Omit<T, "id">,
    value: string
  ) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  return { rows, addRow, handleInputChange };
};