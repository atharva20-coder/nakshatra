// src/lib/table-definitions.ts

export interface TableColumn {
  key: string;
  label: string;
  type: "text" | "date" | "select";
  options?: string[]; // For select type
}

export const getAgencyVisitDetailsColumns = (): TableColumn[] => [
    { key: "srNo", label: "Sr. No", type: "text" },
    { key: "dateOfVisit", label: "Date of Visit", type: "date" },
    { key: "employeeId", label: "Employee ID", type: "text" },
    { key: "employeeName", label: "Employee name", type: "text" },
    { key: "mobileNo", label: "Mobile No.", type: "text" },
    { key: "branchLocation", label: "Branch Location", type: "text" },
    { key: "product", label: "Product", type: "text" },
    { key: "bucketDpd", label: "Bucket/DPD", type: "text" },
    { key: "timeIn", label: "Time In", type: "text" },
    { key: "timeOut", label: "Time Out", type: "text" },
    { key: "signature", label: "Signature", type: "text" },
    { key: "purposeOfVisit", label: "Purpose of Visit", type: "text" },
];

export const getCodeOfConductColumns = (): TableColumn[] => [
  { key: "name", label: "Name (Proprietor/Partner/Director)", type: "text" },
  { key: "signature", label: "Signature", type: "text" },
  { key: "date", label: "Date", type: "date" },
];

export const getDeclarationCumUndertakingColumns = (): TableColumn[] => [
  { key: "collectionManagerName", label: "Collection Manager Name", type: "text" },
  { key: "collectionManagerEmpId", label: "Collection Manager Employee ID", type: "text" },
  { key: "collectionManagerSign", label: "Collection Manager Signature", type: "text" },
];

export const getMonthlyComplianceDeclarationColumns = (): TableColumn[] => [
  { key: "srNo", label: "Sr. No.", type: "text" },
  { key: "complianceParameters", label: "Compliance Parameters", type: "text" },
  { key: "complied", label: "Complied", type: "select", options: ["Yes", "No", "NA"] },
  { key: "agencyRemarks", label: "Agency Remarks", type: "text" },
  { key: "collectionManagerName", label: "Collection Manager Name", type: "text" },
  { key: "collectionManagerEmpId", label: "Collection Manager Emp-ID", type: "text" },
  { key: "collectionManagerSign", label: "Collection Manager Signature", type: "text" },
  { key: "date", label: "Date", type: "date" },
];

export const getAssetManagementDeclarationColumns = (): TableColumn[] => [
  { key: "srNo", label: "Sr. No.", type: "text" },
  { key: "systemCpuSerialNo", label: "System CPU Serial No.", type: "text" },
  { key: "ipAddress", label: "IP address of system", type: "text" },
  { key: "executiveName", label: "Executive Name (Using System)", type: "text" },
  { key: "idCardNumber", label: "ID card number of executive", type: "text" },
  { key: "printerAccess", label: "Printer Access (Yes/No) with reason", type: "text" },
  { key: "assetPermanentlyDisposed", label: "Asset permanently disposed (data purged)", type: "text" },
];

export const getTelephoneLinesDeclarationColumns = (): TableColumn[] => [
  { key: "srNo", label: "Sr. No.", type: "text" },
  { key: "telephoneNo", label: "Telephone No.", type: "text" },
  { key: "username", label: "Username", type: "text" },
  { key: "executiveCategory", label: "Executive Category", type: "text" },
  { key: "recordingLine", label: "Recording Line (Yes/No)", type: "select", options: ["Yes", "No"] },
  { key: "remarks", label: "Remarks", type: "text" },
];

export const getAgencyManpowerRegisterColumns = (): TableColumn[] => [
  { key: "srNo", label: "Sr. No.", type: "text" },
  { key: "executiveCategory", label: "Executive Category", type: "select", options: ["FOS", "Tele-caller", "Tracer", "Backend"] },
  { key: "hhdIdOfFos", label: "HHD Id of FOS", type: "text" },
  { key: "axisIdOfFos", label: "Axis Id of FOS", type: "text" },
  { key: "fosFullName", label: "FOS Full Name", type: "text" },
  { key: "dateOfJoining", label: "Date Of Joining", type: "date" },
  { key: "product", label: "Product", type: "text" },
  { key: "cocSigned", label: "COC Signed (Yes/No)", type: "select", options: ["Yes", "No"] },
  { key: "collectionManagerName", label: "Collection Manager name", type: "text" },
  { key: "collectionManagerId", label: "Collection Manager ID", type: "text" },
  { key: "collectionManagerSign", label: "Collection Manager Sign", type: "text" },
  { key: "dateOfResignation", label: "Date of Resignation of Executive", type: "date" },
  { key: "idCardIssuanceDate", label: "ID cards Issuance Date", type: "date" },
  { key: "idCardReturnExpiryDate", label: "ID card return/Expiry Date", type: "date" },
  { key: "executiveSignature", label: "Executive signature", type: "text" },
  { key: "remarks", label: "Remarks", type: "text" },
];

export const getDeclarationOfProductColumns = (): TableColumn[] => [
  { key: "product", label: "Product", type: "text" },
  { key: "busket", label: "Busket", type: "text" },
  { key: "countOfCaseAllocated", label: "Count of case allocated", type: "text" },
  { key: "collectionManagerName", label: "Collection Manager Name", type: "text" },
  { key: "collectionManagerLocation", label: "Collection Manager Location", type: "text" },
  { key: "cmSign", label: "CM Sign", type: "text" },
];

export const getAgencyPenaltyMatrixColumns = (): TableColumn[] => [
  { key: "noticeRefNo", label: "Notice ref. no./Mail Date", type: "text" },
  { key: "nonComplianceMonth", label: "Non-Compliance Month", type: "text" },
  { key: "parameter", label: "Parameter", type: "text" },
  { key: "product", label: "Product", type: "text" },
  { key: "penaltyAmount", label: "Penalty Amount", type: "text" },
  { key: "penaltyDeductedMonth", label: "Penalty Deducted Month", type: "text" },
  { key: "correctiveActionTaken", label: "Corrective Action Taken", type: "text" },
  { key: "agency", label: "Agency", type: "text" },
  { key: "agencyAuthorizedPersonSign", label: "Agency Authrised Person Signature", type: "text" },
  { key: "signOfFpr", label: "Sign Of FPR", type: "text" },
];

export const getAgencyTrainingTrackerColumns = (): TableColumn[] => [
  { key: "dateOfTraining", label: "Date of Training", type: "date" },
  { key: "trainingAgenda", label: "Training Agenda", type: "text" },
  { key: "trainingName", label: "Training Name", type: "text" },
  { key: "trainerName", label: "Trainer name", type: "text" },
  { key: "trainerEmpId", label: "Trainer Emp ID", type: "text" },
  { key: "noOfAttendees", label: "No. Of Attendees", type: "text" },
  { key: "trainerRemarks", label: "Trainer Remarks", type: "text" },
];

export const getProactiveEscalationManagementTrackerColumns = (): TableColumn[] => [
  { key: "lanOrCardNo", label: "LAN/Card No.", type: "text" },
  { key: "customerName", label: "Customer Name", type: "text" },
  { key: "product", label: "Product", type: "text" },
  { key: "currentBucket", label: "Current Bucket", type: "text" },
  { key: "dateOfContact", label: "Date Of Contact", type: "date" },
  { key: "modeOfContact", label: "Mode of contact", type: "select", options: ["Field Visit", "Call"] },
  { key: "dateOfTrailUploaded", label: "Date Of Trail Uploaded", type: "date" },
  { key: "reasonForTagging", label: "List Of Case with reasons to tag as PEM", type: "text" },
  { key: "collectionManagerNameAndEmpId", label: "Collection Manager Name And Emp ID", type: "text" },
];

export const getEscalationDetailsColumns = (): TableColumn[] => [
  { key: "customerName", label: "Customer Name", type: "text" },
  { key: "loanOrCardNo", label: "Loan/Card NO.", type: "text" },
  { key: "productBucketDpd", label: "Product/Bucket/DPD", type: "text" },
  { key: "dateOfEscalation", label: "Date Escalation", type: "date" },
  { key: "escalationDetail", label: "Escalation Detail", type: "text" },
  { key: "collectionManagerRemark", label: "Collection Manager Remark", type: "text" },
  { key: "collectionManagerSign", label: "Collection Manager Signature", type: "text" },
];

export const getPaymentRegisterColumns = (): TableColumn[] => [
  { key: "srNo", label: "Sr. No.", type: "text" },
  { key: "month", label: "Month", type: "text" },
  { key: "eReceiptNo", label: "E-Receipt No.", type: "text" },
  { key: "acNo", label: "A/C No.", type: "text" },
  { key: "customerName", label: "Customer Name", type: "text" },
  { key: "receiptAmnt", label: "Receipt Amnt", type: "text" },
  { key: "modeOfPayment", label: "Mode of Payment", type: "text" },
  { key: "depositionDate", label: "Deposition Date", type: "date" },
  { key: "fosHhdId", label: "FOS HHD ID", type: "text" },
  { key: "fosName", label: "FOS Name", type: "text" },
  { key: "fosSign", label: "FOS Sign", type: "text" },
  { key: "cmName", label: "CM Name", type: "text" },
  { key: "cmVerificationStatus", label: "CM verification status", type: "text" },
  { key: "remarks", label: "Remarks", type: "text" },
];

export const getRepoKitTrackerColumns = (): TableColumn[] => [
  { key: "srNo", label: "Sr. No.", type: "text" },
  { key: "repoKitNo", label: "Repo Kit No.", type: "text" },
  { key: "issueDateFromBank", label: "Issue Date from bank", type: "date" },
  { key: "lanNo", label: "LAN No.", type: "text" },
  { key: "product", label: "Product", type: "text" },
  { key: "bucketDpd", label: "Buscket/DPD", type: "text" },
  { key: "usedUnused", label: "Used/Unused", type: "select", options: ["Used", "Unused"] },
  { key: "executiveSign", label: "Executive Sign", type: "text" },
  { key: "dateOfReturnToCO", label: "Date of Return to CO", type: "date" },
  { key: "collectionManagerEmpId", label: "Collection manager EMP ID", type: "text" },
  { key: "collectionManagerSign", label: "Collection Manager Sign", type: "text" },
];