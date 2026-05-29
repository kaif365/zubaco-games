type LogArgs = unknown[];

const prefix = "[InfinityLoop]";

export const logger = {
  debug: (...args: LogArgs) => {
    console.debug(prefix, ...args);
  },
  info: (...args: LogArgs) => {
    console.info(prefix, ...args);
  },
  warn: (...args: LogArgs) => {
    console.warn(prefix, ...args);
  },
  error: (...args: LogArgs) => {
    console.error(prefix, ...args);
  },
};
