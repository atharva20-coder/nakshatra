"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MonthlyCompliance, MonthlyComplianceDetail, SubmissionStatus } from "@/generated/prisma";
import { saveMonthlyComplianceAction, deleteMonthlyComplianceAction } from "@/actions/monthly-compliance.action";
import { FORM_CONFIGS } from "@/types/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Trash2, Plus, Loader2 } from "lucide-react";

type MonthlyComplianceWithDetails = MonthlyCompliance & {
    details: MonthlyComplianceDetail[];
};

interface MonthlyComplianceFormProps {
    initialData?: MonthlyComplianceWithDetails;
}

const formConfig = FORM_CONFIGS.monthlyCompliance;

export function MonthlyComplianceForm({ initialData }: MonthlyComplianceFormProps) {
    const router = useRouter();
    const [details, setDetails] = useState<MonthlyComplianceDetail[]>(initialData?.details || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [agencyInfo, setAgencyInfo] = useState({
        name: '',
        empId: '',
        sign: '',
        date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (initialData?.details?.[0]) {
            const firstDetail = initialData.details[0];
            setAgencyInfo({
                name: firstDetail.collectionManagerName || '',
                empId: firstDetail.collectionManagerEmpId || '',
                sign: firstDetail.collectionManagerSign || '',
                date: new Date(firstDetail.date).toISOString().split('T')[0],
            });
        }
    }, [initialData?.details]);

    const handleDetailChange = (id: string, field: keyof MonthlyComplianceDetail, value: string | Date | null) => {
        setDetails(prevDetails =>
            prevDetails.map(detail =>
                detail.id === id ? { ...detail, [field]: value } : detail
            )
        );
    };
    
    const handleApplyToAll = () => {
        if (isSubmitted) return;
        
        const newDate = new Date(agencyInfo.date);
        setDetails(prevDetails =>
            prevDetails.map(detail => ({
                ...detail,
                collectionManagerName: agencyInfo.name,
                collectionManagerEmpId: agencyInfo.empId,
                collectionManagerSign: agencyInfo.sign,
                date: newDate,
            }))
        );
        toast.success("Manager information applied to all rows.");
    };

    const validateForm = () => {
        if (!agencyInfo.name || !agencyInfo.empId || !agencyInfo.sign || !agencyInfo.date) {
            toast.error("Please fill in all manager information fields.");
            return false;
        }

        for (const detail of details) {
            if (!detail.complied || detail.complied === 'NA') {
                toast.error("Please select Yes/No for all compliance parameters.");
                return false;
            }
            if (detail.complied === 'No' && !detail.agencyRemarks) {
                toast.error("Please provide remarks for non-compliant parameters.");
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (status: SubmissionStatus) => {
        if (status === SubmissionStatus.SUBMITTED && !validateForm()) {
            return;
        }

        setIsSubmitting(true);
        const rowsToSubmit = details.map(({ id, complianceId, ...rest }) => ({
            ...rest,
            agencyRemarks: rest.agencyRemarks || "",
            date: new Date(rest.date).toISOString().split('T')[0], // Convert Date to string in YYYY-MM-DD format
        }));

        try {
            const result = await saveMonthlyComplianceAction(
                rowsToSubmit, 
                status === SubmissionStatus.DRAFT ? "DRAFT" : "SUBMITTED", 
                initialData?.id
            );
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`Form ${status === SubmissionStatus.DRAFT ? 'saved' : 'submitted'} successfully!`);
                if (status === SubmissionStatus.SUBMITTED || result.formId) {
                    router.push("/dashboard");
                }
                router.refresh();
            }
        } catch (error) {
            toast.error("An unexpected error occurred.");
            console.error("Form submission error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!initialData?.id || isSubmitted) return;

        setIsDeleting(true);
        try {
            const result = await deleteMonthlyComplianceAction(initialData.id);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Form deleted successfully!");
                router.push("/dashboard");
                router.refresh();
            }
        } catch (error) {
            toast.error("An unexpected error occurred while deleting the form.");
            console.error("Form deletion error:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const isSubmitted = initialData?.status === SubmissionStatus.SUBMITTED;
    const submissionMonth = initialData?.createdAt 
        ? new Date(initialData.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' })
        : new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <Card className={cn("w-full max-w-6xl mx-auto")}>
            <CardHeader className="text-center">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-2xl font-bold">{formConfig.title}</CardTitle>
                    {!isSubmitted && initialData?.id && (
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={handleDelete} 
                            disabled={isDeleting || isSubmitting}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isDeleting ? 'Deleting...' : 'Delete Draft'}
                        </Button>
                    )}
                </div>
                <CardDescription>For the month of {submissionMonth}</CardDescription>
            </CardHeader>
            <CardContent>
                {isSubmitted && (
                    <Alert className="mb-6">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>This form has been submitted.</AlertTitle>
                        <AlertDescription>
                            It can no longer be edited. Please contact an administrator if you need to make changes.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
                    <Input_ 
                        label="Collection Manager Name" 
                        value={agencyInfo.name} 
                        onChange={(e) => setAgencyInfo(prev => ({...prev, name: e.target.value}))} 
                        disabled={isSubmitted || isSubmitting} 
                        required 
                    />
                    <Input_ 
                        label="Employee ID" 
                        value={agencyInfo.empId} 
                        onChange={(e) => setAgencyInfo(prev => ({...prev, empId: e.target.value}))} 
                        disabled={isSubmitted || isSubmitting} 
                        required 
                    />
                    <Input_ 
                        label="Signature" 
                        value={agencyInfo.sign} 
                        onChange={(e) => setAgencyInfo(prev => ({...prev, sign: e.target.value}))} 
                        disabled={isSubmitted || isSubmitting} 
                        required 
                    />
                    <Input_ 
                        label="Date" 
                        type="date" 
                        value={agencyInfo.date} 
                        onChange={(e) => setAgencyInfo(prev => ({...prev, date: e.target.value}))} 
                        disabled={isSubmitted || isSubmitting} 
                        required 
                    />
                    <Button 
                        onClick={handleApplyToAll} 
                        className="md:col-span-4" 
                        size="sm" 
                        disabled={isSubmitted || isSubmitting}
                    >
                        Apply Manager Info to All Rows
                    </Button>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Sr. No.</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-5/12">Compliance Parameters</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">Complied (Yes/No/NA)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-4/12">Agency Remarks (If any)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {details.map((detail) => (
                                <tr key={detail.id} className={detail.complied === 'No' ? 'bg-red-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{detail.srNo}</td>
                                    <td className="px-6 py-4 whitespace-normal text-sm text-gray-900">{detail.complianceParameters}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Select
                                            value={detail.complied}
                                            onValueChange={(value) => handleDetailChange(detail.id, 'complied', value)}
                                            disabled={isSubmitted || isSubmitting}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Yes">Yes</SelectItem>
                                                <SelectItem value="No">No</SelectItem>
                                                <SelectItem value="NA">NA</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Input
                                            type="text"
                                            value={detail.agencyRemarks || ""}
                                            onChange={(e) => handleDetailChange(detail.id, 'agencyRemarks', e.target.value)}
                                            disabled={isSubmitted || isSubmitting}
                                            placeholder={detail.complied === 'No' ? 'Remarks required for non-compliance' : 'Optional remarks'}
                                            className={cn(
                                                detail.complied === 'No' && !detail.agencyRemarks ? 'border-red-500' : ''
                                            )}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!isSubmitted && (
                    <div className="flex justify-end space-x-4 mt-6">
                        <Button 
                            variant="outline" 
                            onClick={() => handleSubmit(SubmissionStatus.DRAFT)} 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Saving..." : "Save Draft"}
                        </Button>
                        <Button 
                            onClick={() => handleSubmit(SubmissionStatus.SUBMITTED)} 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Helper component to avoid repetition
const Input_ = ({ label, required, ...props }: { label: string; required?: boolean } & React.ComponentProps<typeof Input>) => (
    <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <Input {...props} />
    </div>
)

