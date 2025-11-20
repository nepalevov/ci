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

  const jobLink = (job) => (job ? `[Link](${job.html_url})` : '');

  const pickJob = (jobs, predicate) => jobs.find(predicate);

  while (Date.now() - startTime < TIMEOUT) {
    try {
      const { data: run } = await github.rest.actions.getWorkflowRun({ owner, repo, run_id: runId });
      const { data: jobsResponse } = await github.rest.actions.listJobsForWorkflowRun({ owner, repo, run_id: runId });
      const jobs = jobsResponse.jobs || [];

      const deployJob = pickJob(jobs, (j) => j.name === 'deploy-review');
      const e2eChatJob = pickJob(jobs, (j) => j.name && j.name.toLowerCase().includes('chat'));
      const e2eOverlayJob = pickJob(jobs, (j) => j.name && j.name.toLowerCase().includes('overlay'));

      let body = `>GitHub actions run: [${runId}](${run.html_url})\n\n`;
      if (environmentUrl) {
        body += `>Environment URL: [link](${environmentUrl})\n\n`;
      }

      body += `| Stage | Status | Details |\n|---|---|---|\n`;
      body += `| Deploy | ${formatStatus(deployJob)} | ${jobLink(deployJob)} |\n`;
      body += `| E2E Chat | ${formatStatus(e2eChatJob)} | ${jobLink(e2eChatJob)} |\n`;
      body += `| E2E Overlay | ${formatStatus(e2eOverlayJob)} | ${jobLink(e2eOverlayJob)} |\n`;

      await github.rest.issues.updateComment({
        owner: commentOwner,
        repo: commentRepo,
        comment_id: commentId,
        body,
      });

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
