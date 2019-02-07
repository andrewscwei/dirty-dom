export interface UpdateDelegator {
  update: (status: DirtyStatus) => void;
}

export interface DirtyInfo {
  [dirtyType: number]: {
    [key: string]: any;
  };
}

export interface DirtyStatus {
  [dirtyType: number]: boolean | { [key: string]: any };
}
