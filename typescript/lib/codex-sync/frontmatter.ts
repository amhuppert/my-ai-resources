import matter from "gray-matter";
import YAML from "yaml";

// gray-matter uses js-yaml by default, which strictly rejects YAML-reserved
// characters (backticks, @) at the start of unquoted scalar values.
// Third-party plugins (e.g. Expo) use these in skill/agent descriptions.
// The yaml package with strict:false tolerates reserved characters.
const matterOptions: Parameters<typeof matter>[1] = {
  engines: {
    yaml: {
      parse: (str: string) =>
        YAML.parse(str, { strict: false, logLevel: "silent" }) as Record<
          string,
          unknown
        >,
      stringify: (data: object) => YAML.stringify(data),
    },
  },
};

export function parseFrontmatter(content: string) {
  return matter(content, matterOptions);
}

export function stringifyFrontmatter(
  body: string,
  data: Record<string, unknown>,
) {
  return matter.stringify(body, data, matterOptions);
}
