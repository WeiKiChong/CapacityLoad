export interface Notification {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface ProductionDemand {
  id: string;
  orderNo: string;
  componentCode: string;
  componentDesc: string;
  opNo: string;
  opCode: string;
  opDesc: string;
  resourceGroupId: string;
  dueDate: string;
  requiredQty: number;
  completedQty: number;
  rejectedQty: number;
  actualHours: number;
  rawRow?: any;
  original?: {
    orderNo: string;
    componentCode: string;
    componentDesc: string;
    opNo: string;
    opCode: string;
    opDesc: string;
    resourceGroupId: string;
    dueDate: string;
    requiredQty: number;
    completedQty: number;
    rejectedQty: number;
    actualHours: number;
  };
}

export interface ProductionResource {
  id: string;
  name: string;
  type: 'people' | 'machine';
  groupName: string;
  capacity: number;
  team?: string;
  workshop?: string;
  original?: {
    name: string;
    type: 'people' | 'machine';
    groupName: string;
    capacity: number;
  };
}

export interface StandardTime {
  id: string;
  groupName: string;
  peopleCount: number;
  peopleShifts: number;
  peopleDuration: number;
  peopleOee: number;
  machineCount: number;
  machineShifts: number;
  machineDuration: number;
  machineOee: number;
  original?: {
    groupName: string;
    peopleCount: number;
    peopleShifts: number;
    peopleDuration: number;
    peopleOee: number;
    machineCount: number;
    machineShifts: number;
    machineDuration: number;
    machineOee: number;
  };
}

export interface AnalysisResult {
  totalLoad: number;
  totalCapacity: number;
  utilizationRate: number;
  dailyData: {
    date: string;
    team: string;
    load: number;
    humanCapacity: number;
    machineCapacity: number;
  }[];
  monthlyTeamData: MonthlyTeamAnalysis[];
  totalWorkingDays: number;
}

export interface MonthlyTeamAnalysis {
  month: string;
  team: string;
  workingDays: number;
  human: {
    load: number;
    capacity: number;
    utilization: number;
  };
  machine: {
    load: number;
    capacity: number;
    utilization: number;
  };
}

export interface SystemSettings {
  restDays: 'single' | 'double';
  includePublicHolidays: boolean;
  schedulingStrategy: 'EDD' | 'SPT' | 'FCFS';
  enableAutoSave: boolean;
  alertThreshold: number;
  displayDensity: 'compact' | 'comfortable';
  customHolidays: string[];
  calendarOverrides?: { [date: string]: boolean };
  teamOrder?: string[];
}

export type Demand = ProductionDemand;
export type Resource = ProductionResource;
