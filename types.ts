
export interface Prediction {
  className: string;
  probability: number;
}

export interface ControlMethod {
  title: string;
  content: string[];
}

export interface PestInfo {
  description: string;
  methods: ControlMethod[];
}
