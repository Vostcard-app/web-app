/// <reference types="vite/client" />

// Google APIs type declarations
declare global {
  interface Window {
    gapi: any;
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
        };
      };
    };
  }
  
  var gapi: {
    load: (api: string, callback: () => void) => void;
    client: {
      init: (config: any) => Promise<void>;
      people: {
        people: {
          connections: {
            list: (params: any) => Promise<any>;
          };
        };
      };
    };
  };
  
  var google: {
    accounts: {
      oauth2: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: any) => void;
        }) => {
          requestAccessToken: (options?: { prompt?: string }) => void;
        };
      };
    };
  };
}

export {};
