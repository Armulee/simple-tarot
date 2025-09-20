// Google Publisher Tag (GPT) types for TypeScript

declare global {
  interface Window {
    googletag: {
      cmd: Array<() => void>;
      pubads: () => {
        enableSingleRequest: () => void;
        collapseEmptyDivs: () => void;
        setTargeting: (key: string, value: string) => void;
        addEventListener: (event: string, callback: (event: any) => void) => void;
      };
      defineSlot: (adUnitPath: string, size: [number, number], divId: string) => {
        addService: (service: any) => any;
      };
      display: (divId: string) => void;
      enableServices: () => void;
      destroySlots: (slotIds: string[]) => void;
    };
  }
}

export {};