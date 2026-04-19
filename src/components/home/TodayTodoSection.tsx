import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BaseCard from '../ui/BaseCard';
import BottomSheetModal from '../ui/BottomSheetModal';
import { colors, radius, typography } from '../../design/tokens';
import dayjs from '../../lib/dayjs';
import type { DailyTodo, DailyTodoReminderMinutes } from '../../types/domain';

const REMINDER_OPTIONS: Array<{ label: string; value: DailyTodoReminderMinutes }> = [
  { label: '10분전', value: 10 },
  { label: '20분전', value: 20 },
  { label: '30분전', value: 30 },
  { label: '1시간 전', value: 60 },
];

interface TodayTodoSectionProps {
  todos: DailyTodo[];
  isLoading?: boolean;
  onAddTodo: (params: {
    title: string;
    dueTime: string;
    reminderMinutes: DailyTodoReminderMinutes | null;
  }) => Promise<void>;
  onUpdateTodo: (params: {
    todoId: string;
    title: string;
    dueTime: string;
    reminderMinutes: DailyTodoReminderMinutes | null;
  }) => Promise<void>;
  onToggleTodo: (todo: DailyTodo) => Promise<void>;
  onDeleteTodo: (todo: DailyTodo) => Promise<void>;
}

function formatTimeLabel(time: string | null) {
  if (!time) return '시간 미정';
  return time;
}

function formatReminderLabel(minutes: DailyTodoReminderMinutes | null) {
  if (!minutes) return '알림 없음';
  return minutes === 60 ? '1시간 전 알림' : `${minutes}분 전 알림`;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function getNextHourDefault(reminderMinutes: DailyTodoReminderMinutes | null = 10) {
  const base = reminderMinutes ? dayjs().add(reminderMinutes, 'minute') : dayjs();
  const nextHour = base.add(1, 'hour').startOf('hour');
  return {
    hour: nextHour.hour(),
    minute: 0,
  };
}

function buildCandidateTime(hour: number, minute: number) {
  return dayjs().hour(hour).minute(minute).second(0).millisecond(0);
}

export default function TodayTodoSection({
  todos,
  isLoading = false,
  onAddTodo,
  onUpdateTodo,
  onToggleTodo,
  onDeleteTodo,
}: TodayTodoSectionProps) {
  const [draft, setDraft] = React.useState('');
  const [hour, setHour] = React.useState(9);
  const [minute, setMinute] = React.useState(0);
  const [isReminderEnabled, setIsReminderEnabled] = React.useState(true);
  const [reminderMinutes, setReminderMinutes] = React.useState<DailyTodoReminderMinutes | null>(10);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [busyTodoId, setBusyTodoId] = React.useState<string | null>(null);
  const [isComposerOpen, setIsComposerOpen] = React.useState(false);
  const [editingTodoId, setEditingTodoId] = React.useState<string | null>(null);

  const editingTodo = React.useMemo(
    () => todos.find((todo) => todo.id === editingTodoId) ?? null,
    [editingTodoId, todos],
  );

  const reminderTrigger = React.useMemo(() => {
    if (!isReminderEnabled || !reminderMinutes) return null;

    return dayjs()
      .hour(hour)
      .minute(minute)
      .second(0)
      .millisecond(0)
      .subtract(reminderMinutes, 'minute');
  }, [hour, isReminderEnabled, minute, reminderMinutes]);

  const isReminderScheduleInvalid = React.useMemo(() => {
    if (!isReminderEnabled || !reminderTrigger) return false;
    return !reminderTrigger.isAfter(dayjs());
  }, [isReminderEnabled, reminderTrigger]);

  const selectedDueTime = React.useMemo(() => buildCandidateTime(hour, minute), [hour, minute]);

  const isDueTimeInvalid = React.useMemo(() => {
    if (!isReminderEnabled) return false;
    return !selectedDueTime.isAfter(dayjs());
  }, [isReminderEnabled, selectedDueTime]);

  const resetForm = React.useCallback(() => {
    const nextHour = getNextHourDefault(10);
    setDraft('');
    setHour(nextHour.hour);
    setMinute(nextHour.minute);
    setIsReminderEnabled(true);
    setReminderMinutes(10);
    setEditingTodoId(null);
  }, []);

  const openCreateComposer = () => {
    resetForm();
    setIsComposerOpen(true);
  };

  const handleReminderToggle = React.useCallback(() => {
    setIsReminderEnabled((prev) => {
      const next = !prev;
      if (next && !editingTodo?.due_time) {
        const nextHour = getNextHourDefault(reminderMinutes);
        setHour(nextHour.hour);
        setMinute(nextHour.minute);
      }
      return next;
    });
  }, [editingTodo?.due_time, reminderMinutes]);

  const openEditComposer = React.useCallback((todo: DailyTodo) => {
    setEditingTodoId(todo.id);
    setDraft(todo.title);
    const [h = '09', m = '00'] = (todo.due_time ?? '09:00').split(':');
    setHour(Number(h));
    setMinute(Number(m));
    setIsReminderEnabled(!!todo.due_time || !!todo.reminder_minutes);
    setReminderMinutes(todo.reminder_minutes ?? 10);
    setIsComposerOpen(true);
  }, []);

  const handleSubmit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isReminderScheduleInvalid || isDueTimeInvalid) return;

    const dueTime = isReminderEnabled ? `${pad(hour)}:${pad(minute)}` : '';
    const nextReminderMinutes = isReminderEnabled ? reminderMinutes : null;

    setIsSubmitting(true);
    try {
      if (editingTodo) {
        await onUpdateTodo({
          todoId: editingTodo.id,
          title: trimmed,
          dueTime,
          reminderMinutes: nextReminderMinutes,
        });
      } else {
        await onAddTodo({
          title: trimmed,
          dueTime,
          reminderMinutes: nextReminderMinutes,
        });
      }

      setIsComposerOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (todo: DailyTodo) => {
    setBusyTodoId(todo.id);
    try {
      await onToggleTodo(todo);
    } finally {
      setBusyTodoId(null);
    }
  };

  const handleDelete = async (todo: DailyTodo) => {
    setBusyTodoId(todo.id);
    try {
      await onDeleteTodo(todo);
      if (editingTodoId === todo.id) {
        resetForm();
      }
    } finally {
      setBusyTodoId(null);
    }
  };

  const adjustHour = React.useCallback(
    (delta: number) => {
      const nextHour = (hour + delta + 24) % 24;
      const candidate = buildCandidateTime(nextHour, minute);
      if (!candidate.isAfter(dayjs())) return;
      setHour(nextHour);
    },
    [hour, minute],
  );

  const adjustMinute = React.useCallback(
    (delta: number) => {
      const nextMinute = (minute + delta + 60) % 60;
      const candidate = buildCandidateTime(hour, nextMinute);
      if (!candidate.isAfter(dayjs())) return;
      setMinute(nextMinute);
    },
    [hour, minute],
  );

  return (
    <>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>TODO</Text>
          <Pressable style={styles.plusButton} onPress={openCreateComposer}>
            <Ionicons name="add" size={18} color={colors.white} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {!isLoading && todos.length === 0 ? (
          <Text style={styles.emptyText}>오늘 할 일을 추가해보세요.</Text>
        ) : null}

        {!isLoading ? (
          <View style={styles.todoList}>
            {todos.map((todo) => {
              const isBusy = busyTodoId === todo.id;
              return (
                <BaseCard glassOnly padded={false} key={todo.id} style={styles.todoItemCard}>
                  <View style={styles.todoRow}>
                    <TouchableOpacity
                      style={styles.todoMain}
                      onPress={() => void handleToggle(todo)}
                      activeOpacity={0.75}
                      disabled={isBusy}
                    >
                      <View
                        style={[styles.checkCircle, todo.is_completed && styles.checkCircleDone]}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : todo.is_completed ? (
                          <Ionicons name="checkmark" size={12} color={colors.success} />
                        ) : null}
                      </View>
                      <View style={styles.todoContent}>
                        <Text
                          numberOfLines={2}
                          style={[styles.todoText, todo.is_completed && styles.todoTextDone]}
                        >
                          {todo.title}
                        </Text>
                        <Text style={styles.todoMeta}>
                          {formatTimeLabel(todo.due_time)} ·{' '}
                          {formatReminderLabel(todo.reminder_minutes)}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => void handleDelete(todo)}
                      activeOpacity={0.75}
                      style={styles.iconButton}
                      disabled={isBusy}
                    >
                      <Ionicons name="close" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </BaseCard>
              );
            })}
          </View>
        ) : null}
      </View>

      <BottomSheetModal
        visible={isComposerOpen}
        onClose={() => {
          if (isSubmitting) return;
          setIsComposerOpen(false);
          resetForm();
        }}
        title={editingTodo ? '오늘 할 일 수정' : '오늘 할 일 추가'}
        maxHeight={'78%'}
      >
        <ScrollView contentContainerStyle={styles.modalBody}>
          <Text style={styles.modalSectionTitle}>오늘 만든 할 일 (수정)</Text>
          <View style={styles.modalList}>
            {todos.length === 0 ? (
              <Text style={styles.modalEmptyText}>아직 만든 할 일이 없어요.</Text>
            ) : (
              todos.map((todo) => (
                <TouchableOpacity
                  key={todo.id}
                  activeOpacity={0.8}
                  onPress={() => (editingTodoId === todo.id ? resetForm() : openEditComposer(todo))}
                  style={[
                    styles.modalTodoRow,
                    editingTodoId === todo.id ? styles.modalTodoRowSelected : null,
                  ]}
                >
                  <View style={styles.modalTodoTextWrap}>
                    <Text numberOfLines={1} style={styles.modalTodoTitle}>
                      {todo.title}
                    </Text>
                    <Text style={styles.modalTodoMeta}>
                      {formatTimeLabel(todo.due_time)} ·{' '}
                      {formatReminderLabel(todo.reminder_minutes)}
                    </Text>
                  </View>
                  {editingTodoId === todo.id ? (
                    <Text style={styles.editingBadge}>수정중</Text>
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.formSectionBorder} />

          <Text style={styles.modalLabel}>할일</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="예: 운동화 세탁 맡기기"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={50}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void handleSubmit()}
          />

          <View style={styles.toggleRow}>
            <Text style={styles.modalLabel}>알림 받기</Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleReminderToggle}
              style={[styles.togglePill, isReminderEnabled ? styles.togglePillActive : null]}
            >
              <View
                style={[styles.toggleThumb, isReminderEnabled ? styles.toggleThumbActive : null]}
              />
              <Text style={[styles.toggleText, isReminderEnabled ? styles.toggleTextActive : null]}>
                {isReminderEnabled ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          {isReminderEnabled ? (
            <>
              <Text style={styles.modalLabel}>해야하는 시간</Text>
              <View style={styles.timePickerRow}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeBlockLabel}>시</Text>
                  <View style={styles.adjustRow}>
                    <TouchableOpacity style={styles.adjustButton} onPress={() => adjustHour(-1)}>
                      <Ionicons name="remove" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{pad(hour)}</Text>
                    <TouchableOpacity style={styles.adjustButton} onPress={() => adjustHour(1)}>
                      <Ionicons name="add" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.timeColon}>:</Text>

                <View style={styles.timeBlock}>
                  <Text style={styles.timeBlockLabel}>분</Text>
                  <View style={styles.adjustRow}>
                    <TouchableOpacity style={styles.adjustButton} onPress={() => adjustMinute(-5)}>
                      <Ionicons name="remove" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{pad(minute)}</Text>
                    <TouchableOpacity style={styles.adjustButton} onPress={() => adjustMinute(5)}>
                      <Ionicons name="add" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Text style={styles.modalLabel}>알림</Text>
              <View style={styles.reminderWrap}>
                {REMINDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    activeOpacity={0.8}
                    onPress={() => {
                      setReminderMinutes(option.value);
                      if (!editingTodo?.due_time) {
                        const nextHour = getNextHourDefault(option.value);
                        setHour(nextHour.hour);
                        setMinute(nextHour.minute);
                      }
                    }}
                    style={[
                      styles.reminderChip,
                      reminderMinutes === option.value ? styles.reminderChipActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reminderChipText,
                        reminderMinutes === option.value ? styles.reminderChipTextActive : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {isReminderScheduleInvalid ? (
                <Text style={styles.validationText}>
                  현재 설정이면 알림 시간이 이미 지났어요. 시간을 더 늦추거나 알림 시간을
                  줄여주세요.
                </Text>
              ) : isDueTimeInvalid ? (
                <Text style={styles.validationText}>
                  해야하는 시간은 현재 시각 이후로만 설정할 수 있어요.
                </Text>
              ) : null}
            </>
          ) : null}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (!draft.trim() || isSubmitting || isReminderScheduleInvalid || isDueTimeInvalid) &&
                styles.submitButtonDisabled,
            ]}
            onPress={() => void handleSubmit()}
            disabled={
              !draft.trim() || isSubmitting || isReminderScheduleInvalid || isDueTimeInvalid
            }
            activeOpacity={0.82}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>{editingTodo ? '수정하기' : '추가하기'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 120,
    paddingTop: 10,
  },
  formSectionBorder: {
    height: 1,
    backgroundColor: colors.borderMuted,
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 26,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand,
    letterSpacing: 0.3,
  },
  modalSectionTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  plusButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 14,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  todoList: {
    marginTop: 12,
    gap: 8,
  },
  todoItemCard: {
    marginTop: 0,
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 22,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 2,
  },
  todoMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  todoContent: {
    flex: 1,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.2,
    borderColor: colors.borderMuted,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    borderColor: colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
  },
  todoText: {
    fontSize: 14,
    lineHeight: 18,
    color: colors.text,
    flex: 1,
  },
  todoTextDone: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  todoMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 3,
  },
  iconButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 12,
  },
  modalList: {
    gap: 8,
  },
  modalEmptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalTodoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  modalTodoRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.brandLight,
  },
  modalTodoTextWrap: {
    flex: 1,
  },
  modalTodoTitle: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  modalTodoMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  editingBadge: {
    ...typography.body,
    color: colors.primaryDark,
    fontWeight: '700',
  },
  formHeaderRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  resetText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  modalLabel: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  toggleRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  togglePill: {
    minWidth: 74,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: colors.borderMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  togglePillActive: {
    backgroundColor: colors.brandLight,
    borderColor: colors.primary,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.textMuted,
  },
  toggleThumbActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  toggleTextActive: {
    color: colors.primaryDark,
  },
  input: {
    minHeight: 50,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    paddingHorizontal: 14,
    color: colors.text,
    ...typography.body,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timeBlock: {
    flex: 1,
    maxWidth: 150,
    alignItems: 'center',
    gap: 8,
  },
  timeBlockLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  adjustRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: colors.borderMuted,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  adjustButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
  },
  timeColon: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textSecondary,
    marginTop: 18,
  },
  reminderWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  reminderChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.brandLight,
  },
  reminderChipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  reminderChipTextActive: {
    color: colors.primaryDark,
  },
  validationText: {
    ...typography.body,
    color: colors.error,
    marginTop: -2,
  },
  submitButton: {
    marginTop: 8,
    minHeight: 50,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    ...typography.bodyStrong,
    color: colors.white,
  },
});
