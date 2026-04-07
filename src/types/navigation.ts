export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  ProfileEdit: undefined;
  TeamDetail: { teamId: string };
  TeamMember: { teamId: string };
  TeamProfileEdit: { teamId: string };
  MemberStats: { userId: string; teamId?: string; nickname: string };
  AppSettings: undefined;
  AddRoutine: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  HomeTab: undefined;
  GoalTab: undefined;
  CalendarTab: undefined;
  StatsTab: undefined;
  MyPageTab: undefined;
};
