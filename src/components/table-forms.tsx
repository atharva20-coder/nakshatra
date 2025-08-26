import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Save, Send, Loader2 } from 'lucide-react';

interface TableFormProps<T extends { id: string | number }> {
  headers: { label: string; required?: boolean }[];
  rows: T[];
  renderCell: (row: T, key: keyof T) => React.ReactNode;
  onAddRow?: () => void;
  onSave?: () => void;
  onSubmit?: () => void;
  isPending?: boolean;
  showActions?: boolean;
}

export function TableForm<T extends { id: string | number }>({

  headers,
  rows,
  renderCell,
  onAddRow,
  onSave,
  onSubmit,
  isPending = false,
  showActions = true,
}: TableFormProps<T>) {
  const canAddRow = showActions && onAddRow && !isPending;
  const canSave = showActions && onSave && !isPending;
  const canSubmit = showActions && onSubmit && !isPending;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          {canAddRow && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddRow}
              disabled={isPending}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className="text-left p-3 font-semibold text-sm"
                    >
                      {header.label}
                      {header.required && <span className="text-red-500 ml-1">*</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.id} className="border-b hover:bg-muted/25">
                    {Object.keys(row)
                      .filter(key => key !== 'id')
                      .map((key, cellIndex) => (
                        <td key={cellIndex} className="p-3">
                          {renderCell(row, key as keyof T)}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          {showActions && (canSave || canSubmit) && (
            <div className="flex items-center justify-end gap-4 pt-4 border-t">
              {canSave && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSave}
                  disabled={isPending}
                  className="flex items-center gap-2"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save as Draft
                </Button>
              )}
              
              {canSubmit && (
                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={isPending}
                  className="flex items-center gap-2"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit
                </Button>
              )}
            </div>
          )}

          {!showActions && (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">This form has been submitted and is read-only.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}