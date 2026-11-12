import { z } from "zod/v3";
import type { ToolDeps, ToolRegistrationServer } from "./toolTypes.js";

const episodeId = z
  .string()
  .regex(/^[a-zA-Z0-9]{26}$/)
  .describe("LISTENのエピソードID");

function result(response: { status: number; body: unknown }) {
  const { status, body } = response;
  return {
    isError: status >= 400,
    content: [{ type: "text" as const, text: JSON.stringify({ status, body }) }],
  };
}

export function registerTranscriptSegmentsTools(
  server: ToolRegistrationServer,
  { fetchTranscriptSegments }: Pick<ToolDeps, "fetchTranscriptSegments">,
) {
  server.registerTool(
    "get_episode_transcript_segments",
    {
      description:
        "編集用の文字起こしを発言単位で取得します。各発言の番号・本文・時刻・話者・出演者と編集に必要なversionを返します。next_offsetで続きを取得できます。ページ間でversionが変わった場合は取り直してください。",
      annotations: { readOnlyHint: true },
      inputSchema: {
        episodeId,
        offset: z.number().int().nonnegative().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        start: z.number().finite().nonnegative().optional().describe("時間範囲の開始（秒）"),
        end: z.number().finite().positive().optional().describe("時間範囲の終了（秒）"),
      },
    },
    async ({ episodeId, ...filters }) =>
      result(await fetchTranscriptSegments(episodeId, { filters })),
  );

  server.registerTool(
    "update_episode_transcript_segments",
    {
      description:
        "文字起こしの本文だけを発言番号で最大200件まとめて修正します。時刻・話者・出演者・チャプターは維持します。versionは取得結果の値を使用し、409の場合は取り直して差分を再確認してください。修正案だけの場合はdryRunをtrueにします。",
      annotations: { readOnlyHint: false, destructiveHint: true },
      inputSchema: {
        episodeId,
        version: z.string().regex(/^[a-f0-9]{64}$/),
        edits: z
          .array(z.object({
            index: z.number().int().nonnegative(),
            text: z.string().max(4000).refine((text) => text.trim().length > 0),
          }).strict())
          .min(1)
          .max(200),
        dryRun: z.boolean().optional(),
      },
    },
    async ({ episodeId, version, edits, dryRun }) =>
      result(await fetchTranscriptSegments(episodeId, {
        update: { version, edits, dry_run: dryRun },
      })),
  );
}
