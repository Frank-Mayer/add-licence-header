// copyright 2023

import * as path from "path";
import * as fs from "fs";
import { globSync } from "glob";
import * as core from "@actions/core";
import Mustache from "mustache";

function main() {
  let licenseParam = "copyright {{year}}"; //core.getInput("license", { required: true });

  const globParam = "src/*.ts"; //core.getInput("glob", { required: true });

  const encodingParam = (core.getInput("encoding", { required: false }) ||
    "utf8") as BufferEncoding;

  const lineEndingParam =
    core.getInput("line_ending", { required: false }) || "lf";
  const lineEnding = lineEndingParam === "crlf" ? "\r\n" : "\n";

  const commentParam = core.getInput("comment", { required: false }) || "//";

  const licenseCode = makeLicenseCode(licenseParam, commentParam, lineEnding);

  const files = globSync(globParam, { cwd: process.cwd() });

  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    const fileContent = fs.readFileSync(filePath, encodingParam);

    const sb = new Array<string>();

    sb.push(licenseCode);

    // remove all comment lines
    const lines = fileContent.split(/\r?\n/g);
    let stage = 0;
    for (const line of lines) {
      const trimmedLine = line.trim();
      switch (stage) {
        case 0:
          if (trimmedLine.length === 0) {
            continue;
          }
          if (trimmedLine.startsWith(commentParam)) {
            stage = 1;
            continue;
          }
          stage = 2;
          break;
        case 1:
          if (trimmedLine.startsWith(commentParam)) {
            continue;
          }
          stage = 2;
          break;
        case 2:
          sb.push(line);
          break;
      }
    }

    fs.writeFileSync(filePath, sb.join(lineEnding), encodingParam);

    core.info(`License added to ${file}`);
  }

  if (files.length === 0) {
    core.warning(`No files found for glob ${globParam}`);
    return;
  }
}

function makeLicenseCode(license: string, comment: string, lineEnding: string) {
  const view = {
    year: new Date().getFullYear(),
  };

  return (
    Mustache.render(license, view)
      .split(/\r?\n/g)
      .map((line) => `${comment} ${line}`)
      .join(lineEnding) + lineEnding
  );
}

try {
  main();
} catch (error) {
  core.setFailed(error.message);
}
