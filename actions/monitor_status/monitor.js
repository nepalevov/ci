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
  const currentJobName = process.env.GITHUB_JOB;

  console.log(
    `Starting monitor for Run ID: ${runId}, Comment ID: ${commentId}, Comment Repo: ${commentOwner}/${commentRepo}`
  );

  let lastBody = null;
  try {
    const { data: existingComment } = await github.rest.issues.getComment({
      owner: commentOwner,
      repo: commentRepo,
      comment_id: commentId,
    });
    lastBody = existingComment.body;
  } catch (error) {
    console.warn('Unable to load existing comment, proceeding without baseline.', error);
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

  const pickJob = (jobs, predicate) => jobs.find(predicate);
  const formatLink = (text, url) =>
    url ? `[${text}](${url})` : text;

  while (Date.now() - startTime < TIMEOUT) {
    try {
      const { data: run } = await github.rest.actions.getWorkflowRun({ owner, repo, run_id: runId });
      const { data: jobsResponse } = await github.rest.actions.listJobsForWorkflowRun({ owner, repo, run_id: runId });
      const jobs = jobsResponse.jobs || [];

      const deployJob = pickJob(jobs, (j) => j.name && j.name.toLowerCase().includes('deploy'));
      const e2eChatJob = pickJob(
        jobs,
        (j) => j.name && j.name.toLowerCase().includes('chat') && !j.name.toLowerCase().includes('overlay')
      );
      const e2eOverlayJob = pickJob(
        jobs,
        (j) => j.name && j.name.toLowerCase().includes('overlay')
      );

      const environmentStatus = formatStatus(deployJob);
      const environmentLinkTarget = (() => {
        if (!deployJob) return '';
        if (deployJob.conclusion === 'success') {
          return environmentUrl || '';
        }
        return deployJob.html_url || '';
      })();

      let body = `>GitHub actions run: [${runId}](${run.html_url})\n\n`;
      body += `| Stage                        | Status         |\n`;
      body += `| ---------------------------- | -------------- |\n`;
      body += `| Environment                  | ${formatLink(environmentStatus, environmentLinkTarget)} |\n`;
      body += `| Tests ai-dial-chat           | ${formatLink(formatStatus(e2eChatJob), e2eChatJob?.html_url || '')} |\n`;
      body += `| Tests ai-dial-chat (overlay) | ${formatLink(formatStatus(e2eOverlayJob), e2eOverlayJob?.html_url || '')} |\n`;

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
    } catch (error) {
      console.error('Error in monitor loop:', error);
    }

    await delay(10000);
  }
};
