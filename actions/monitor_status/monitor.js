module.exports = async ({ github, context, core, inputs }) => {
  const { owner, repo } = context.repo;
  const runId = context.runId;
  const commentId = inputs.commentId;
  const commentOwner = inputs.commentOwner || owner;
  const commentRepo = inputs.commentRepo || repo;
  const environmentUrl = inputs.environmentUrl;

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const startTime = Date.now();
  const TIMEOUT = 60 * 60 * 1000; // 60 minutes
  const CYCLE_INTERVAL = 30 * 1000; // 30 seconds
  const currentJobName = process.env.GITHUB_JOB;

  console.log(
    `Starting monitor for Run ID: ${runId}, Comment ID: ${commentId}, Comment Repo: ${commentOwner}/${commentRepo}`
  );

  let lastBody = null;
  let preservedContent = '';
  try {
    const { data: existingComment } = await github.rest.issues.getComment({
      owner: commentOwner,
      repo: commentRepo,
      comment_id: commentId,
    });
    lastBody = existingComment.body;
    if (lastBody) {
      const lines = lastBody.split('\n');
      if (lines.length > 0 && lines[0].trim().startsWith('/')) {
        preservedContent = lines[0] + '\n\n';
      }
    }
  } catch (error) {
    console.warn('Unable to load existing comment data to append to, will overwrite', error);
  }

  const formatStatus = (job) => {
    if (!job) return 'Pending ⏳';
    if (job.status === 'queued') return 'Queued ⏳';
    if (job.status === 'in_progress') return 'In Progress 🔄';
    if (job.conclusion === 'success') return 'Success ✅';
    if (job.conclusion === 'failure') return 'Failed ❌';
    if (job.conclusion === 'cancelled') return 'Cancelled 🚫';
    if (job.conclusion === 'skipped') return 'Skipped ➖';
    return job.status;
  };

  const formatLink = (text, url) =>
    url ? `[${text}](${url})` : text;

  const jobTimestamp = (job) => {
    const timestamp = job?.started_at || job?.created_at || job?.completed_at;
    return timestamp ? Date.parse(timestamp) : Number.MAX_SAFE_INTEGER;
  };

  const formatStageCell = (label, link) => {
    const safeLabel = label || '(Unnamed job)';
    return link ? `[${safeLabel}](${link})` : safeLabel;
  };

  const buildTable = (run, jobs) => {
    const rows = [];

    const sortedJobs = (jobs || [])
      .filter((job) => job.name !== currentJobName)
      .map((job) => ({ ...job, displayName: job?.name?.trim() || '(Unnamed job)' }))
      .sort((a, b) => {
        const diff = jobTimestamp(a) - jobTimestamp(b);
        if (diff !== 0) return diff;
        return a.displayName.localeCompare(b.displayName);
      });

    const runLinkFallback = run.html_url || '';

    if (sortedJobs.length === 0) {
      rows.push(`| ${formatStageCell('Jobs not started yet')} | Pending ⏳ |`);
    } else {
      sortedJobs.forEach((job) => {
        const stageLink =
          job.displayName.toLowerCase().includes('deploy') && job.conclusion === 'success' && environmentUrl
            ? environmentUrl
            : undefined;
        const statusLink = job.html_url || runLinkFallback;
        rows.push(`| ${formatStageCell(job.displayName, stageLink)} | ${formatLink(formatStatus(job), statusLink)} |`);
      });
    }

    return [
      '| Stage                        | Status         |',
      '| ---------------------------- | -------------- |',
      ...rows,
      '',
    ].join('\n');
  };

  while (Date.now() - startTime < TIMEOUT) {
    try {
      const { data: run } = await github.rest.actions.getWorkflowRun({ owner, repo, run_id: runId });
      const { data: jobsResponse } = await github.rest.actions.listJobsForWorkflowRun({ owner, repo, run_id: runId });
      const jobs = jobsResponse.jobs || [];

      let body = preservedContent;
      body += `>GitHub actions run: [${runId}](${run.html_url})\n\n`;
      body += buildTable(run, jobs);

      if (body !== lastBody) {
        await github.rest.issues.updateComment({
          owner: commentOwner,
          repo: commentRepo,
          comment_id: commentId,
          body,
        });
        lastBody = body;
      }

      const otherJobs = jobs.filter((job) => job.name !== currentJobName);
      if (otherJobs.length > 0 && otherJobs.every((job) => job.status === 'completed')) {
        console.log('All other jobs completed. Exiting monitor.');
        break;
      }
      else {
        // Mention job names left and theirs statuses
        console.log(
          'Jobs still in progress:',
          otherJobs
            .filter((job) => job.status !== 'completed')
            .map((job) => `${job.name} (${formatStatus(job)})`)
            .join(', ')
        );
      }
    } catch (error) {
      console.error('Error in monitor loop:', error);
    }
    // Mention time elapsed and time left until timeout
    const elapsed = Date.now() - startTime;
    const timeLeft = TIMEOUT - elapsed;
    console.log(
      `Time elapsed: ${(elapsed / 1000 / 60).toFixed(2)} minutes, time left: ${(timeLeft / 1000 / 60).toFixed(2)} minutes`
    );
    await delay(CYCLE_INTERVAL);
  }
};
