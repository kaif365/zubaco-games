export {
  fetchTournaments,
  deleteTournament,
  deleteTournaments,
  fetchTournamentById,
  updateTournament,
  fetchTournamentAssignedStageIds,
  createTournament,
  addStagesToTournament,
  removeStagesFromTournament,
} from "@/lib/api/endpoints/tournaments";

export type {
  FetchTournamentsParams,
  CreateTournamentPayload,
  AddStagesPayload,
  DeleteTournamentsPayload,
  UpdateTournamentPayload,
} from "@/lib/api/endpoints/tournaments";
