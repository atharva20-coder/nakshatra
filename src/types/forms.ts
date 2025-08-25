// src/types/forms.ts
export interface BaseFormRow {
  id: number | string; // Changed to allow string IDs from DB and number for new rows
}

// 1. Code of Conduct
export interface CodeOfConductRow extends BaseFormRow {
  name: string;               // Proprietor/Partner/Director
  signature: string;
  date: string;
}

// 2. Declaration Collection Manager (for Declaration Cum Undertaking)
export interface DeclarationManagerRow extends BaseFormRow {
  collectionManagerName: string;
  collectionManagerEmployeeId: string;
  collectionManagerSignature: string;
}

// 3. Agency Visit Details (existing)
export interface AgencyTableRow extends BaseFormRow {
  srNo: string;
  dateOfVisit: string;
  employeeId: string;
  employeeName: string;
  mobileNo: string;
  branchLocation: string;
  product: string;
  bucketDpd: string;
  timeIn: string;
  timeOut: string;
  signature: string;
  purposeOfVisit: string;
}

// 4. Monthly Compliance Declaration
export interface MonthlyComplianceRow extends BaseFormRow {
  srNo: string;
  complianceParameters: string;
  complied: string;                    // Yes/No/NA
  agencyRemarks: string;
  collectionManagerName: string;
  collectionManagerEmpId: string;
  collectionManagerSign: string;
  date: string;
}

// 5. Asset Management Declaration
export interface AssetManagementRow extends BaseFormRow {
  srNo: string;
  systemCpuSerialNo: string;
  ipAddress: string;
  executiveName: string;
  idCardNumber: string;
  printerAccess: string;              // Yes/No with reason
  assetDisposed: string;              // data purged info
}

// 6. Telephone Lines Declaration
export interface TelephoneDeclarationRow extends BaseFormRow {
  srNo: string;
  telephoneNo: string;
  username: string;
  executiveCategory: string;
  recordingLine: string;              // Yes/No
  remarks: string;
}

// 7. Agency Manpower Register
export interface ManpowerRegisterRow extends BaseFormRow {
  srNo: string;
  executiveCategory: string;          // FOS/Tele-caller/Tracer/Backend
  hhdIdOfFos: string;
  axisIdOfFos: string;
  fosFullName: string;
  dateOfJoining: string;
  product: string;
  cocSigned: string;                  // Yes/No
  collectionManagerName: string;
  collectionManagerId: string;
  collectionManagerSign: string;
  dateOfResignation: string;
  idCardsIssuanceDate: string;
  idCardReturnDate: string;
  executiveSignature: string;
  remarks: string;
}

// 8. Declaration of Product
export interface ProductDeclarationRow extends BaseFormRow {
  product: string;
  bucket: string;
  countOfCaseAllocated: string;
  collectionManagerName: string;
  collectionManagerLocation: string;
  cmSign: string;
}

// 9. Agency Penalty Matrix
export interface PenaltyMatrixRow extends BaseFormRow {
  noticeRefNo: string;
  nonComplianceMonth: string;
  parameter: string;
  product: string;
  penaltyAmount: string;
  penaltyDeductedMonth: string;
  correctiveActionTaken: string;
  agency: string;
  agencyAuthorisedPersonSign: string;
  signOfFpr: string;
}

// 10. Agency Training Tracker
export interface TrainingTrackerRow extends BaseFormRow {
  dateOfTraining: string;
  trainingAgenda: string;
  trainingName: string;
  trainerName: string;
  trainerEmpId: string;
  noOfAttendees: string;
  trainerRemarks: string;
}

// 11. Proactive Escalation Management Tracker
export interface ProactiveEscalationRow extends BaseFormRow {
  lanCardNo: string;
  customerName: string;
  product: string;
  currentBucket: string;
  dateOfContact: string;
  modeOfContact: string;              // Field Visit/Call
  dateOfTrailUploaded: string;
  listOfCaseWithReasons: string;
  collectionManagerNameId: string;
}

// 12. Escalation Details
export interface EscalationDetailsRow extends BaseFormRow {
  customerName: string;
  loanCardNo: string;
  productBucketDpd: string;
  dateEscalation: string;
  escalationDetail: string;
  collectionManagerRemark: string;
  collectionManagerSign: string;
}

// 13. Payment Register
export interface PaymentRegisterRow extends BaseFormRow {
  srNo: string;
  month: string;
  eReceiptNo: string;
  accountNo: string;
  customerName: string;
  receiptAmount: string;
  modeOfPayment: string;
  depositionDate: string;
  fosHhdId: string;
  fosName: string;
  fosSign: string;
  cmName: string;
  cmVerificationStatus: string;
  remarks: string;
}

// 14. Repo Kit Tracker
export interface RepoKitTrackerRow extends BaseFormRow {
  srNo: string;
  repoKitNo: string;
  issueDateFromBank: string;
  lanNo: string;
  product: string;
  bucketDpd: string;
  usedUnused: string;                 // Used/Unused
  executiveSign: string;
  dateOfReturnToCo: string;
  collectionManagerEmpId: string;
  collectionManagerSign: string;
}

// Form metadata type
export interface FormMetadata {
  id: string;
  title: string;
  description: string;
  category: 'monthly' | 'quarterly' | 'annual' | 'adhoc';
  isRequired: boolean;
  deadlineDay: number; // Day of month (e.g., 5 for 5th)
}

export const FORM_CONFIGS = {
  codeOfConduct: {
    id: 'codeOfConduct',
    title: 'Code of Conduct',
    description: 'Declaration of adherence to conduct guidelines',
    category: 'annual',
    isRequired: true,
    deadlineDay: 5
  },
  declarationCumUndertaking: {
    id: 'declarationCumUndertaking',
    title: 'Declaration Cum Undertaking',
    description: 'Agency undertaking with collection manager details',
    category: 'monthly',
    isRequired: true,
    deadlineDay: 5
  },
  agencyVisits: {
    id: 'agencyVisits',
    title: 'Agency Visit Details',
    description: 'Details of bank visits by agency personnel',
    category: 'monthly',
    isRequired: true,
    deadlineDay: 5
  },
  monthlyCompliance: {
    id: 'monthlyCompliance',
    title: 'Monthly Compliance Declaration',
    description: 'Monthly compliance parameter reporting',
    category: 'monthly',
    isRequired: true,
    deadlineDay: 5
  },
  assetManagement: {
    id: 'assetManagement',
    title: 'Asset Management Declaration',
    description: 'IT assets and system management details',
    category: 'monthly',
    isRequired: true,
    deadlineDay: 5
  },
  telephoneDeclaration: {
    id: 'telephoneDeclaration',
    title: 'Telephone Lines Declaration',
    description: 'Telephone line usage and recording details',
    category: 'monthly',
    isRequired: true,
    deadlineDay: 5
  },
  manpowerRegister: {
    id: 'manpowerRegister',
    title: 'Agency Manpower Register',
    description: 'Employee details and management information',
    category: 'monthly',
    isRequired: true,
    deadlineDay: 5
  },
  productDeclaration: {
    id: 'productDeclaration',
    title: 'Declaration of Product',
    description: 'Product allocation and collection manager details',
    category: 'monthly',
    isRequired: true,
    deadlineDay: 5
  },
  penaltyMatrix: {
    id: 'penaltyMatrix',
    title: 'Agency Penalty Matrix',
    description: 'Penalty tracking and corrective actions',
    category: 'monthly',
    isRequired: false,
    deadlineDay: 5
  },
  trainingTracker: {
    id: 'trainingTracker',
    title: 'Agency Training Tracker',
    description: 'Training sessions and attendance tracking',
    category: 'monthly',
    isRequired: false,
    deadlineDay: 5
  },
  proactiveEscalation: {
    id: 'proactiveEscalation',
    title: 'Proactive Escalation Management Tracker',
    description: 'Customer escalation management tracking',
    category: 'monthly',
    isRequired: true,
    deadlineDay: 5
  },
  escalationDetails: {
    id: 'escalationDetails',
    title: 'Escalation Details',
    description: 'Detailed escalation case management',
    category: 'monthly',
    isRequired: false,
    deadlineDay: 5
  },
  paymentRegister: {
    id: 'paymentRegister',
    title: 'Payment Register',
    description: 'Payment receipt and verification tracking',
    category: 'monthly',
    isRequired: true,
    deadlineDay: 5
  },
  repoKitTracker: {
    id: 'repoKitTracker',
    title: 'Repo Kit Tracker',
    description: 'Repository kit issuance and return tracking',
    category: 'monthly',
    isRequired: false,
    deadlineDay: 5
  }
} as const;

export type FormType = keyof typeof FORM_CONFIGS;

// Utility functions
export const getFormDeadline = (month: number, year: number, deadlineDay: number): Date => {
  return new Date(year, month - 1, deadlineDay, 23, 59, 59);
};

export const isFormOverdue = (month: number, year: number, deadlineDay: number): boolean => {
  const deadline = getFormDeadline(month, year, deadlineDay);
  return new Date() > deadline;
};

export const canEditForm = (
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED',
  month: number,
  year: number,
  deadlineDay: number
): boolean => {
  if (status === 'DRAFT') {
    return !isFormOverdue(month, year, deadlineDay);
  }
  return false; // Submitted forms need approval to edit
};
