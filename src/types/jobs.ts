export interface Job {
  id: string
  name: string
  kind: string
  status: 'idle' | 'ready' | 'running' | 'done' | 'error' | 'cancelled'
  userId: string
  
  // File paths
  inputPath?: string
  preppedInputPath?: string
  outputPath?: string
  
  // Configuration
  columns?: string[]
  selectedColumn?: string
  
  // Progress tracking
  totalSites: number
  processedSites: number
  emailsFound: number
  percent: number
  
  // Execution info
  logs?: string[]
  returnCode?: number
  startedAt?: Date
  endedAt?: Date
  
  createdAt: Date
  updatedAt: Date
}

export interface CreateJobRequest {
  name: string
  kind?: string
}

export interface UploadFileRequest {
  jobId?: string
}

export interface ConfigureJobRequest {
  jobId: string
  name: string
  urlColumn?: string
  column?: string
  companyColumn?: string
  addressColumn?: string
}

export interface StartJobRequest {
  jobId: string
}

export interface JobProgress {
  status: string
  name: string
  totalSites: number
  processedSites: number
  emailsFound: number
  percent: number
  log: string[]
  hasConfig: boolean
}