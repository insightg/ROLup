export interface Field {
  field_name: string;
  type: "checkbox" | "date" | "listbox" | "upload" | "text";
  label: string;
  value: string;
  options?: string[];
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  stato: string;
  priority?: string;
  exclude_from_completion?: boolean;
  fields: Field[];
  type_code?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  stato: string;
  progress: number;
  subtasks: Subtask[];
}

export interface Order {
  id: string;
  title: string;
  stato: string;
  data_creazione: string;
  progress: number;
  tipo_attivita_desc?: string;
  tipo_attivita_codice?: string;
  pm_id?: string;
  pm_username?: string;
  pm_full_name?: string;
  tasks: Task[];
}

export interface POS {
  id: string;
  nome_account: string;
  sf_region: string;
  sf_district: string;
  sf_territory: string;
  rrp_segment: string;
  trade: string;
  children: Order[];
  overall_status: string;
}

export interface Stats {
  total_pos_with_orders: number;
  orders_assigned: number;
  orders_in_progress: number;
  orders_completed: number;
}

