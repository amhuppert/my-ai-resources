import { Eta } from "eta";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { InstallConfig } from "./install-types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eta = new Eta({ autoEscape: false, autoTrim: false });

/**
 * Convert hyphenated skill name to Title Case for display
 */
export function titleCaseSkillName(skillName: string): string {
  return skillName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Validate skill name format
 */
export function validateSkillName(skillName: string): {
  valid: boolean;
  message: string;
} {
  if (!/^[a-z0-9-]+$/.test(skillName)) {
    return {
      valid: false,
      message: `Skill name '${skillName}' must be hyphen-case (lowercase letters, digits, and hyphens only)`,
    };
  }

  if (skillName.startsWith("-") || skillName.endsWith("-")) {
    return {
      valid: false,
      message: `Skill name '${skillName}' cannot start or end with a hyphen`,
    };
  }

  if (skillName.includes("--")) {
    return {
      valid: false,
      message: `Skill name '${skillName}' cannot contain consecutive hyphens`,
    };
  }

  if (skillName.length > 40) {
    return {
      valid: false,
      message: `Skill name '${skillName}' is too long (max 40 characters)`,
    };
  }

  return { valid: true, message: "Skill name is valid" };
}

/**
 * Validate an existing skill structure
 */
export async function validateSkill(
  skillPath: string,
): Promise<{ valid: boolean; message: string }> {
  const skillMdPath = join(skillPath, "SKILL.md");

  if (!existsSync(skillMdPath)) {
    return { valid: false, message: "SKILL.md not found" };
  }

  let content: string;
  try {
    content = await readFile(skillMdPath, "utf-8");
  } catch (error) {
    return {
      valid: false,
      message: `Error reading SKILL.md: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (!content.startsWith("---")) {
    return { valid: false, message: "No YAML frontmatter found" };
  }

  const frontmatterMatch = content.match(/^---\n(.*?)\n---/s);
  if (!frontmatterMatch || !frontmatterMatch[1]) {
    return { valid: false, message: "Invalid frontmatter format" };
  }

  const frontmatter = frontmatterMatch[1];

  if (!frontmatter.includes("name:")) {
    return { valid: false, message: "Missing 'name' in frontmatter" };
  }

  if (!frontmatter.includes("description:")) {
    return { valid: false, message: "Missing 'description' in frontmatter" };
  }

  const nameMatch = frontmatter.match(/name:\s*(.+)/);
  if (nameMatch && nameMatch[1]) {
    const name = nameMatch[1].trim();

    if (!/^[a-z0-9-]+$/.test(name)) {
      return {
        valid: false,
        message: `Name '${name}' should be hyphen-case (lowercase letters, digits, and hyphens only)`,
      };
    }

    if (name.startsWith("-") || name.endsWith("-") || name.includes("--")) {
      return {
        valid: false,
        message: `Name '${name}' cannot start/end with hyphen or contain consecutive hyphens`,
      };
    }
  }

  const descMatch = frontmatter.match(/description:\s*(.+)/);
  if (descMatch && descMatch[1]) {
    const description = descMatch[1].trim();
    if (description.includes("<") || description.includes(">")) {
      return {
        valid: false,
        message: "Description cannot contain angle brackets (< or >)",
      };
    }
  }

  return { valid: true, message: "Skill is valid!" };
}

/**
 * Initialize a new skill with template structure
 */
export async function initSkill(
  skillName: string,
  scope: "project" | "user",
  config: InstallConfig,
): Promise<void> {
  const nameValidation = validateSkillName(skillName);
  if (!nameValidation.valid) {
    throw new Error(nameValidation.message);
  }

  const skillsBaseDir =
    scope === "project"
      ? join(config.paths.projectClaudeDir, "skills")
      : join(config.paths.userClaudeDir, "skills");

  const skillDir = join(skillsBaseDir, skillName);

  if (existsSync(skillDir)) {
    throw new Error(`Skill directory already exists: ${skillDir}`);
  }

  try {
    mkdirSync(skillDir, { recursive: true });
    console.log(`✅ Created skill directory: ${skillDir}`);
  } catch (error) {
    throw new Error(
      `Error creating directory: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const skillTitle = titleCaseSkillName(skillName);
  const templateData = {
    skillName,
    skillTitle,
  };

  const templatesDir = join(__dirname, "../templates");

  try {
    const skillTemplateContent = await readFile(
      join(templatesDir, "skill-template.eta"),
      "utf-8",
    );
    const skillContent = eta.renderString(skillTemplateContent, templateData);
    const skillMdPath = join(skillDir, "SKILL.md");
    writeFileSync(skillMdPath, skillContent, "utf-8");
    console.log("✅ Created SKILL.md");

    const referencesDir = join(skillDir, "references");
    mkdirSync(referencesDir);
    const referenceTemplateContent = await readFile(
      join(templatesDir, "skill-reference-doc.eta"),
      "utf-8",
    );
    const referenceContent = eta.renderString(
      referenceTemplateContent,
      templateData,
    );
    const exampleReferencePath = join(referencesDir, "api_reference.md");
    writeFileSync(exampleReferencePath, referenceContent, "utf-8");
    console.log("✅ Created references/api_reference.md");

    const assetsDir = join(skillDir, "assets");
    mkdirSync(assetsDir);
    const assetTemplateContent = await readFile(
      join(templatesDir, "skill-asset-placeholder.eta"),
      "utf-8",
    );
    const assetContent = eta.renderString(assetTemplateContent, templateData);
    const exampleAssetPath = join(assetsDir, "example_asset.txt");
    writeFileSync(exampleAssetPath, assetContent, "utf-8");
    console.log("✅ Created assets/example_asset.txt");

    console.log(
      `\n✅ Skill '${skillName}' initialized successfully at ${skillDir}`,
    );
    console.log("\nNext steps:");
    console.log(
      "1. Edit SKILL.md to complete the TODO items and update the description",
    );
    console.log(
      "2. Customize or delete the example files in references/ and assets/",
    );
    console.log(
      "3. Implement helper commands if needed (see SKILL.md for guidance)",
    );
    console.log("4. Run the validator when ready to check the skill structure");
  } catch (error) {
    throw new Error(
      `Error creating skill files: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
