import { STORAGE_KEYS } from "@/constants/storageKeys";
import {
  readStorageFlag,
  writeStorageFlag,
} from "@/lib/storage/localStorageHelpers";

const STORAGE_KEY = STORAGE_KEYS.randomMapOnStart;

export function readRandomMapOnStart(): boolean {
  return readStorageFlag(STORAGE_KEY);
}

export function writeRandomMapOnStart(value: boolean): void {
  writeStorageFlag(STORAGE_KEY, value);
}
