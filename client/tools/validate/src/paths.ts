import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** client/ — the workspace root: it owns content/, the compose files and this tool. */
export const CLIENT_ROOT = path.resolve(here, "../../..");
/** The repository root, one level above client/. */
export const REPO_ROOT = path.resolve(CLIENT_ROOT, "..");
export const CONTENT_DIR = path.join(CLIENT_ROOT, "content");
/** server/ is a sibling of client/: the learner's FastAPI workspace. */
export const SERVER_DIR = path.join(REPO_ROOT, "server");
export const VALIDATE_DIR = path.resolve(here, "..");
/** Scratch workspace: server/ with every learner file replaced by its reference solution. */
export const WORKSPACE_DIR = path.join(VALIDATE_DIR, ".workspace");
export const COMPOSE_FILE = path.join(CLIENT_ROOT, "docker-compose.validate.yml");
