// Shared reporter for bakery-qa commands. Output format and exit codes follow
// specs/001-sweet-crumb-website/contracts/qa-cli.md.

export const EXIT_OK = 0;
export const EXIT_FAILED = 1;
export const EXIT_CANNOT_RUN = 2;

export function createReport(name, { quiet = false } = {}) {
  const errors = [];
  const warnings = [];
  const print = (line) => {
    if (!quiet) console.log(line);
  };

  return {
    errors,
    warnings,
    error(where, msg) {
      errors.push({ where, msg });
      print(`✖ ERROR  ${where}: ${msg}`);
    },
    warn(where, msg) {
      warnings.push({ where, msg });
      print(`⚠ WARN   ${where}: ${msg}`);
    },
    summary(details = '') {
      const counts = `${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`;
      const prefix = details ? `${details}, ` : '';
      print(errors.length ? `✖ ${name}: ${prefix}${counts}` : `✔ ${name}: ${prefix}${counts}`);
    },
    exitCode() {
      return errors.length ? EXIT_FAILED : EXIT_OK;
    },
  };
}

/** Print a "could not run" message and exit with code 2. */
export function cannotRun(name, msg) {
  console.log(`✖ ${name}: could not run: ${msg}`);
  process.exit(EXIT_CANNOT_RUN);
}
