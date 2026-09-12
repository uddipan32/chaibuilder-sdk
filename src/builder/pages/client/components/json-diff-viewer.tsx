"use client";

import { formatDate } from "~/utils/vendor/format-date";
import { isArray, isPlainObject, isString, map, mapValues, startsWith, trim } from "lodash-es";
import { Check, Copy, FileJson } from "lucide-react";
import { ReactElement, useId, useMemo, useState } from "react";
import { Diff, Hunk, parseDiff } from "react-diff-view";
import { useRevisionComparison } from "~/builder/pages/hooks/use-revision-comparison";
import { useChaiUserInfo } from "~/builder/pages/hooks/utils/use-chai-user-info";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Loading } from "~/components/ui/loader";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

const RevisionTag = ({ version }: { version: { uid: string; label: string; item: any } }) => {
  const item = version?.item;
  const { data: user } = useChaiUserInfo(item?.currentEditor);
  const isLive = version.label === "live";
  const isDraft = version.label === "draft";

  return (
    <span
      className={`flex min-h-8 items-center gap-x-2 rounded border bg-surface px-2 text-xs text-foreground shadow-lg`}>
      <div
        className={
          "h-full items-center rounded px-1.5 py-0.5 capitalize" +
          (isLive ? " bg-success" : isDraft ? " bg-warning" : " bg-purple")
        }>
        {version.label}
      </div>
      <div className="py-1 text-xs font-light leading-none">
        <div>
          <span className="font-light">{isDraft ? "Currently editing" : "Published by"}</span>
          {!isDraft && <span className="pl-1 font-medium">{user?.name || "Unknown"}</span>}
        </div>
        {item?.createdAt && (
          <div className="pt-0.5 text-[10px] font-light leading-tight text-muted">
            {formatDate(item.createdAt, "dd MMM yyyy, h:mm a")}
          </div>
        )}
      </div>
    </span>
  );
};

// Tags component from page-revisions.tsx
const Tags = ({ version }: { version: { uid: string; label: string; item: any } }) => {
  return <RevisionTag version={version} />;
};

// Function to generate git diff format from JSON objects
function generateGitDiff(oldData: any, newData: any, filename: string = "data.json"): string {
  const oldJson = JSON.stringify(oldData, null, 2);
  const newJson = JSON.stringify(newData, null, 2);

  const oldLines = oldJson.split("\n");
  const newLines = newJson.split("\n");

  let diff = `--- a/${filename}\n`;
  diff += `+++ b/${filename}\n`;

  // Create a more sophisticated diff
  const changes: string[] = [];
  let i = 0,
    j = 0;

  // Main loop runs while both sides have lines; leftovers are flushed below.
  // Coercing out-of-bounds reads to "" would make a genuine trailing empty
  // line match past-the-end and be misclassified as unchanged.
  while (i < oldLines.length && j < newLines.length) {
    const oldLine = oldLines[i];
    const newLine = newLines[j];

    if (oldLine === newLine) {
      changes.push(` ${oldLine}`);
      i++;
      j++;
    } else {
      // Find the next matching line
      let oldMatch = -1,
        newMatch = -1;

      // Bounded look-ahead keeps the diff O(N·window) instead of O(N²) — block
      // payloads run to thousands of lines and this executes on the main thread.
      // Changes further apart than the window still produce a correct diff, just
      // with longer insert/delete runs.
      const maxLookAhead = 100;

      // Look ahead in old lines
      for (let k = i + 1; k < Math.min(oldLines.length, i + 1 + maxLookAhead); k++) {
        if (newLines[j] === oldLines[k]) {
          oldMatch = k;
          break;
        }
      }

      // Look ahead in new lines
      for (let k = j + 1; k < Math.min(newLines.length, j + 1 + maxLookAhead); k++) {
        if (oldLines[i] === newLines[k]) {
          newMatch = k;
          break;
        }
      }

      if (oldMatch !== -1 && (newMatch === -1 || oldMatch - i <= newMatch - j)) {
        // Remove lines from old
        for (let k = i; k < oldMatch; k++) {
          changes.push(`-${oldLines[k]}`);
        }
        i = oldMatch;
      } else if (newMatch !== -1) {
        // Add lines to new
        for (let k = j; k < newMatch; k++) {
          changes.push(`+${newLines[k]}`);
        }
        j = newMatch;
      } else {
        // No match found, replace current line
        changes.push(`-${oldLine}`);
        changes.push(`+${newLine}`);
        i++;
        j++;
      }
    }
  }

  // Flush whatever remains on either side as pure deletions/additions
  while (i < oldLines.length) {
    changes.push(`-${oldLines[i]}`);
    i++;
  }
  while (j < newLines.length) {
    changes.push(`+${newLines[j]}`);
    j++;
  }

  // Add hunk header
  const oldCount = oldLines.length;
  const newCount = newLines.length;
  diff += `@@ -1,${oldCount} +1,${newCount} @@\n`;

  // Add all changes
  diff += changes.join("\n") + "\n";

  return diff;
}

// * Deep parse JSON
function deepParseJSON(input: any, strict = false): any {
  // * If it's a string, check if it "looks" like JSON
  if (isString(input)) {
    const str = trim(input);

    // Only unwrap embedded JSON objects/arrays. Parsing primitive-looking
    // strings would coerce types (and lose precision on long numeric IDs),
    // creating false differences in the diff.
    const looksLikeJSON = startsWith(str, "{") || startsWith(str, "[");

    if (looksLikeJSON) {
      try {
        const parsed = JSON.parse(str);
        return deepParseJSON(parsed, strict);
      } catch {
        if (strict) {
          throw new Error(`Invalid JSON string: ${str}`);
        }
        return {};
      }
    }

    return input;
  }

  // * If it's an array, recurse into each item
  if (isArray(input)) {
    return map(input, (item) => deepParseJSON(item, strict));
  }

  // * If it's a plain object, recurse into its values
  if (isPlainObject(input)) {
    return mapValues(input, (val) => deepParseJSON(val, strict));
  }

  // * Return any other values as-is
  return input;
}

/**
 *
 * @param key
 * Returns a human-readable label for a given comparison type key.
 *
 * @param key - The key representing a comparison type (e.g., "blocks", "seo", "tracking").
 * @returns The label to display for the given comparison type key.
 */
const getCompareTypeOptionLabel = (key: string): string => {
  switch (key) {
    case "blocks":
      return "Blocks";
    case "seo":
      return "SEO";
    case "tracking":
      return "Tracking";
    default:
      return key;
  }
};

/**
 *
 * @param leftData
 * @param rightData
 * @returns Compare Options
 */
const getCompareOptions = (leftData: any, rightData: any) => {
  if (!leftData || !rightData) return [{ key: "blocks", label: "Blocks" }];

  const leftKeys = Object.keys(leftData);
  const rightKeys = Object.keys(rightData);
  const commonKeys = leftKeys.filter((key) => rightKeys.includes(key));

  const options = commonKeys
    .map((key) => ({ key: key, label: getCompareTypeOptionLabel(key) }))
    .filter((item) => item.key.length > 0);

  return options;
};

/**
 *
 * @param changes
 * @returns Data without common data
 */
const withHiddenCommonData = (changes: any[], contextLines: number = 3): any[] => {
  const keepIndexes = new Set<number>();

  // Find indexes of non-normal lines (real changes)
  const changeIndexes = changes
    .map((change, index) => ({ change, index }))
    .filter(({ change }) => change.type !== "normal")
    .map(({ index }) => index);

  // Add context lines around each change
  changeIndexes.forEach((i) => {
    const start = Math.max(0, i - contextLines);
    const end = Math.min(changes.length - 1, i + contextLines);
    for (let j = start; j <= end; j++) {
      keepIndexes.add(j);
    }
  });

  // Collect filtered changes and detect gaps for hidden lines
  const result: any[] = [];
  let prevIndex = -1;

  changes.forEach((change, index) => {
    if (keepIndexes.has(index)) {
      // If there's a gap from prevIndex to current index, insert hidden entry
      if (prevIndex !== -1 && index - prevIndex > 1) {
        const hiddenFrom = changes[prevIndex].lineNumber != null ? changes[prevIndex].lineNumber + 1 : prevIndex + 2;
        const hiddenTo = changes[index].lineNumber != null ? changes[index].lineNumber - 1 : index;
        result.push({
          // Unique negative line number so react-diff-view's change key
          // ('D' + lineNumber) never collides between markers or real lines
          lineNumber: -(result.length + 1),
          content: (
            <Badge className="pointer-events-none w-60 -translate-x-1/2 cursor-default border-none bg-transparent py-1 shadow-none">
              <span className="rounded border border-border bg-surface px-3 py-1 text-[11px] font-light leading-none text-muted-foreground">
                No changes from <span className="font-mono">{hiddenFrom}</span> to{" "}
                <span className="font-mono">{hiddenTo}</span>
              </span>
            </Badge>
          ),
        });
      }
      result.push(change);
      prevIndex = index;
    }
  });

  return result;
};

interface JsonDiffViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compare: { uid: string; label: string; item: any }[];
}

export default function JsonDiffViewer({ open, compare, onOpenChange }: JsonDiffViewerProps) {
  const version1 = compare[0];
  const version2 = compare[1];

  // Unique per mounted viewer — hard-coded Switch ids would collide (and
  // break label association for assistive tech) when two comparisons are
  // open at once (e.g. topbar viewer + revisions panel viewer)
  const idPrefix = useId();

  const [copiedSide, setCopiedSide] = useState<"left" | "right" | null>(null);
  const [viewType, setViewType] = useState<"split" | "unified">("split");
  const [showRawData, setShowRawData] = useState(false);
  const [hideCommonData, setHideCommonData] = useState(true);
  const [compareType, setCompareType] = useState("blocks");

  const { data: comparisonData, isLoading } = useRevisionComparison(version1, version2);

  const { leftData, rightData, options } = useMemo(() => {
    const _leftData = (comparisonData as any)?.version1?.[compareType];
    const _rightData = (comparisonData as any)?.version2?.[compareType];
    const leftData = deepParseJSON(_leftData);
    const rightData = deepParseJSON(_rightData);
    const options = getCompareOptions((comparisonData as any)?.version1, (comparisonData as any)?.version2);
    return { leftData, rightData, options };
  }, [comparisonData, compareType]);

  const gitDiffText = useMemo(() => {
    if (!leftData || !rightData) return "";
    return generateGitDiff(leftData, rightData);
  }, [leftData, rightData]);

  const parsedDiff = useMemo(() => {
    if (!gitDiffText) return [];
    try {
      return parseDiff(gitDiffText);
    } catch (error) {
      console.error("Failed to parse diff:", error);
      return [];
    }
  }, [gitDiffText]);

  // Identical versions produce a hunk of only 'normal' lines; rendering the Diff table
  // then puts the empty-state <div> inside a <table>, so detect this case up front and
  // skip the table entirely.
  const hasDifferences = useMemo(
    () =>
      parsedDiff.some((file) => file.hunks?.some((hunk) => hunk.changes?.some((change) => change.type !== "normal"))),
    [parsedDiff],
  );

  const copyToClipboard = async (data: any, side: "left" | "right") => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedSide(side);
      setTimeout(() => setCopiedSide(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatJson = (data: any) => {
    return JSON.stringify(data, null, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-[1900px] flex-col p-0">
        <DialogHeader className="border-b px-3 py-2">
          <DialogTitle className="flex items-center justify-between gap-2 leading-none">
            <div className="flex items-center gap-2">
              Compare{""}
              <Tabs value={compareType} onValueChange={setCompareType}>
                <TabsList>
                  {options.map((option) => (
                    <TabsTrigger key={option.key} value={option.key} className="px-3 text-xs">
                      {option.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-1 items-center justify-end pr-8">
              <div className="flex w-max items-center justify-end gap-2 divide-x-2 rounded-md border p-1.5">
                <div className="flex items-center gap-2 px-2">
                  <Switch
                    id={`${idPrefix}-diff-split-view`}
                    disabled={showRawData}
                    checked={showRawData ? true : viewType === "split"}
                    onCheckedChange={(checked) => setViewType(checked ? "split" : "unified")}
                  />
                  <label htmlFor={`${idPrefix}-diff-split-view`} className="cursor-pointer text-xs font-normal">
                    Split View
                  </label>
                </div>
                <div className="flex items-center gap-2 px-2">
                  <Switch
                    id={`${idPrefix}-diff-raw-data`}
                    aria-labelledby={`${idPrefix}-diff-raw-data-label`}
                    checked={showRawData}
                    onCheckedChange={(checked) => setShowRawData(checked)}
                  />
                  <span id={`${idPrefix}-diff-raw-data-label`} className="text-xs font-normal">
                    Show Raw Data
                  </span>
                </div>
                <div className="flex items-center gap-2 px-2">
                  <Switch
                    id={`${idPrefix}-diff-hide-common`}
                    aria-labelledby={`${idPrefix}-diff-hide-common-label`}
                    checked={hideCommonData}
                    onCheckedChange={(checked) => setHideCommonData(checked)}
                  />
                  <span id={`${idPrefix}-diff-hide-common-label`} className="text-xs font-normal">
                    Hide Common Data
                  </span>
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <Loading className="h-4 w-4" />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="relative min-h-0 flex-1">
              <div className="absolute -top-5 z-50 mt-0.5 flex w-full items-center justify-between gap-2">
                <div className="flex w-1/2 items-center justify-center gap-2">
                  <Tags version={version1} />
                </div>
                <div className="flex w-1/2 items-center justify-center gap-2">
                  <Tags version={version2} />
                </div>
              </div>
              {!showRawData ? (
                <ScrollArea className="h-full overflow-y-auto rounded-lg border bg-white text-black">
                  {parsedDiff.length === 0 || !hasDifferences ? (
                    <div className="flex h-full min-h-80 items-center justify-center p-6">
                      <div className="text-center text-muted-foreground">
                        <FileJson className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p>
                          {parsedDiff.length === 0
                            ? "No differences found or unable to parse diff"
                            : "These versions are identical — no differences found"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {parsedDiff.map((file, index) => (
                        <div key={index} className="relative mb-4">
                          <Diff
                            key={hideCommonData ? "hide-common-data" : "show-common-data"}
                            viewType={viewType}
                            diffType={file.type}
                            hunks={file.hunks}
                            className="rounded-lg text-xs">
                            {(hunks) =>
                              hunks
                                .map((hunk, hunkIndex) => {
                                  const changes = hideCommonData ? withHiddenCommonData(hunk.changes) : hunk.changes;
                                  // A <div> here would sit inside the <Diff> <table>; the
                                  // identical-versions case is handled above via hasDifferences.
                                  if (changes?.length === 0) return null;
                                  return <Hunk key={hunkIndex} hunk={{ ...hunk, changes }} />;
                                })
                                .filter((element): element is ReactElement => element !== null)
                            }
                          </Diff>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              ) : (
                <div className="grid h-full grid-cols-2 gap-3 rounded-lg border">
                  <div className="relative flex min-h-0 flex-col border-r">
                    <div className="absolute -top-4 right-4 z-50">
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(leftData, "left")}>
                        {copiedSide === "left" ? <Check className="text-green-500" /> : <Copy />}
                        Copy
                      </Button>
                    </div>
                    <ScrollArea className="flex-1 rounded-lg bg-surface p-2 text-foreground">
                      <pre className="whitespace-pre-wrap font-mono text-xs">{formatJson(leftData)}</pre>
                    </ScrollArea>
                  </div>

                  <div className="relative flex min-h-0 flex-col">
                    <div className="absolute -top-4 right-4 z-50">
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(rightData, "right")}>
                        {copiedSide === "right" ? <Check className="text-green-500" /> : <Copy />}
                        Copy
                      </Button>
                    </div>
                    <ScrollArea className="flex-1 rounded-lg bg-surface p-2 text-foreground">
                      <pre className="whitespace-pre-wrap font-mono text-xs">{formatJson(rightData)}</pre>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
