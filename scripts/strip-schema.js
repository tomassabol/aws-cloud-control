/**
 * Utility to remove $schema attribute from JSON schema.
 *
 * Note: $schema attribute breaks Spectral linter rules
 */

let input = ""

process.stdin
  .on("data", (buf) => (input += buf.toString("utf-8")))
  .on("end", () => {
    const { $schema, ...rest } = JSON.parse(input)
    console.log(JSON.stringify(rest, null, 2))
  })
  .on("error", (err) => {
    console.error(err)
    process.exit(1)
  })
