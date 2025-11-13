"use client";

import React, { useState } from 'react'; // <-- FIX: Destructure useState
import { ComplianceParameter } from "@/generated/prisma";
import {
  createComplianceParameterAction,
  updateComplianceParameterAction,
  deleteComplianceParameterAction,
  reorderComplianceParametersAction
} from "@/actions/compliance-parameter.action";
import { Reorder, useDragControls } from "framer-motion";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, Plus, Save, Trash2, Edit, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert"; // <-- FIX: Import Alert components
import { Badge } from "@/components/ui/badge"; // <-- FIX: Import Badge component

type Parameter = ComplianceParameter;

interface ParameterManagerProps {
  initialParameters: Parameter[];
}

export function ComplianceParameterManager({ initialParameters }: ParameterManagerProps) {
  const [parameters, setParameters] = useState(initialParameters);
  const [isSavingOrder, setIsSavingOrder] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const [currentParam, setCurrentParam] = React.useState<Parameter | null>(null);
  
  const [newParam, setNewParam] = React.useState({
    parameter: "",
    category: "",
  });

  const handleReorder = (newOrder: Parameter[]) => {
    setParameters(newOrder);
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    const orderedIds = parameters.map(p => p.id);
    const result = await reorderComplianceParametersAction(orderedIds);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Parameter order saved successfully!");
    }
    setIsSavingOrder(false);
  };

  // --- Add/Edit/Delete Handlers ---

  const openAddDialog = () => {
    setNewParam({ parameter: "", category: "" });
    setIsAddDialogOpen(true);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    const result = await createComplianceParameterAction(newParam);
    if (result.error) {
      toast.error(result.error);
    } else if (result.parameter) {
      toast.success("Parameter created successfully.");
      setParameters(prev => [...prev, result.parameter]);
      setIsAddDialogOpen(false);
    }
    setIsSubmitting(false);
  };
  
  const openEditDialog = (param: Parameter) => {
    setCurrentParam(param);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!currentParam) return;
    
    setIsSubmitting(true);
    const result = await updateComplianceParameterAction({
      id: currentParam.id,
      parameter: currentParam.parameter,
      category: currentParam.category || "",
      isActive: currentParam.isActive,
    });
    
    if (result.error) {
      toast.error(result.error);
    } else if (result.parameter) {
      toast.success("Parameter updated successfully.");
      setParameters(prev => prev.map(p => p.id === result.parameter.id ? result.parameter : p));
      setIsEditDialogOpen(false);
      setCurrentParam(null);
    }
    setIsSubmitting(false);
  };

  const openDeleteDialog = (param: Parameter) => {
    setCurrentParam(param);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDelete = async () => {
    if (!currentParam) return;

    setIsSubmitting(true);
    const result = await deleteComplianceParameterAction(currentParam.id);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Parameter deleted successfully.");
      setParameters(prev => prev.filter(p => p.id !== currentParam.id));
      setIsDeleteDialogOpen(false);
      setCurrentParam(null);
    }
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Compliance Parameters</CardTitle>
        <CardDescription>
          Drag and drop to reorder. Add, edit, or deactivate parameters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex justify-end gap-2">
          <Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-2" /> Add New Parameter</Button>
          <Button onClick={handleSaveOrder} variant="outline" disabled={isSavingOrder}>
            {isSavingOrder ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Order
          </Button>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <Reorder.Group axis="y" values={parameters} onReorder={handleReorder}>
            {parameters.map((param) => (
              <ParameterItem
                key={param.id}
                parameter={param}
                onEdit={() => openEditDialog(param)}
                onDelete={() => openDeleteDialog(param)}
              />
            ))}
          </Reorder.Group>
        </div>

        {/* --- Add Dialog --- */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Compliance Parameter</DialogTitle>
              <DialogDescription>
                This will be added to the end of the list. You can reorder it after saving.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newParameter">Parameter Text</Label>
                <Textarea
                  id="newParameter"
                  placeholder="Enter the compliance parameter text..."
                  value={newParam.parameter}
                  onChange={(e) => setNewParam(p => ({ ...p, parameter: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newCategory">Category (Optional)</Label>
                <Input
                  id="newCategory"
                  placeholder="e.g., General, IT, HR"
                  value={newParam.category}
                  onChange={(e) => setNewParam(p => ({ ...p, category: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="button" onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Parameter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- Edit Dialog --- */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Compliance Parameter</DialogTitle>
            </DialogHeader>
            {currentParam && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Sr. No: {currentParam.srNo}</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editParameter">Parameter Text</Label>
                  <Textarea
                    id="editParameter"
                    value={currentParam.parameter}
                    onChange={(e) => setCurrentParam(p => p ? { ...p, parameter: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCategory">Category (Optional)</Label>
                  <Input
                    id="editCategory"
                    value={currentParam.category || ""}
                    onChange={(e) => setCurrentParam(p => p ? { ...p, category: e.target.value } : null)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="editIsActive"
                    checked={currentParam.isActive}
                    onCheckedChange={(checked) => setCurrentParam(p => p ? { ...p, isActive: !!checked } : null)}
                  />
                  <Label htmlFor="editIsActive" className="font-normal">
                    Active (Parameter is visible on new forms)
                  </Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="button" onClick={handleUpdate} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* --- Delete Dialog --- */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Parameter?</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this parameter? This action is only possible if no agencies have ever submitted a response for it.
              </DialogDescription>
            </DialogHeader>
            {currentParam && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You are about to delete: <strong>&ldquo;{currentParam.parameter}&rdquo;</strong>.
                  <br />
                  If this fails, it means the parameter is in use. You should **Deactivate** it via the &ldquo;Edit&rdquo; menu instead.
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Yes, Delete Parameter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
}

// --- Sub-component for each row item ---
interface ParameterItemProps {
  parameter: Parameter;
  onEdit: () => void;
  onDelete: () => void;
}

function ParameterItem({ parameter, onEdit, onDelete }: ParameterItemProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={parameter}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 border-b dark:border-gray-700 last:border-b-0"
    >
      <Button
        variant="ghost"
        size="icon"
        onPointerDown={(e) => {
          // Prevent text selection from triggering drag
          if (e.target instanceof HTMLElement && e.target.closest('button, input, textarea')) return;
          dragControls.start(e);
        }}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </Button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${!parameter.isActive && "line-through text-muted-foreground"}`}>
          <span className="font-bold">{parameter.srNo}.</span> {parameter.parameter}
        </p>
        <p className="text-xs text-muted-foreground">
          Category: {parameter.category || "N/A"}
        </p>
      </div>
      <Badge variant={parameter.isActive ? "default" : "secondary"} className={parameter.isActive ? "bg-green-100 text-green-800" : ""}>
        {parameter.isActive ? "Active" : "Inactive"}
      </Badge>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={onEdit}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </Reorder.Item>
  );
}