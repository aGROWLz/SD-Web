import { redirectSeedanceModel } from '../domain/relay-station';
import type { SeeDance2SubmissionParams } from './seedance2.service';

interface RelayTaskSubmitter {
  submitTask(params: SeeDance2SubmissionParams): Promise<string>;
}

export const submitRelayTask = (
  submitter: RelayTaskSubmitter,
  storedParams: Record<string, any>,
  modelRedirects: unknown,
): Promise<string> => {
  const submissionParams = redirectSeedanceModel(
    storedParams,
    modelRedirects,
  ) as SeeDance2SubmissionParams;

  return submitter.submitTask(submissionParams);
};
