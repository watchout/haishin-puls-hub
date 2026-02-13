<script setup lang="ts">
// EVT-010-014: イベントタスクボード
// 仕様書: docs/design/features/project/EVT-010-014_master-schedule.md §6
import type { CreateTaskPayload, TaskStatus, TaskPriority } from '~/composables/useTasks'

definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const eventId = route.params.id as string

const {
  tasks,
  summary,
  isLoading,
  error,
  fetchTasks,
  createTask,
  updateTask,
  completeTask,
  deleteTask,
  generateTasks,
} = useTasks(eventId)

// 初期読み込み
onMounted(() => {
  fetchTasks()
})

// フィルタ
const roleFilter = ref<string>('')
const statusFilter = ref<string>('')

async function applyFilter() {
  await fetchTasks({
    role: roleFilter.value || undefined,
    status: statusFilter.value || undefined,
  })
}

watch([roleFilter, statusFilter], () => {
  applyFilter()
})

// モーダル制御
const showCreateModal = ref(false)
const showDeleteConfirm = ref(false)
const deleteTargetId = ref<string | null>(null)

const form = ref<CreateTaskPayload>({
  title: '',
  description: '',
  assigned_role: '',
  priority: 'medium',
  relative_day: undefined,
  sort_order: 0,
})

function openCreateModal() {
  form.value = {
    title: '',
    description: '',
    assigned_role: '',
    priority: 'medium',
    relative_day: undefined,
    sort_order: 0,
  }
  showCreateModal.value = true
}

async function handleCreate() {
  const result = await createTask(form.value)
  if (result) {
    showCreateModal.value = false
  }
}

async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
  if (newStatus === 'completed') {
    await completeTask(taskId)
  } else {
    await updateTask(taskId, { status: newStatus })
  }
}

function confirmDelete(id: string) {
  deleteTargetId.value = id
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (deleteTargetId.value) {
    await deleteTask(deleteTargetId.value)
    showDeleteConfirm.value = false
    deleteTargetId.value = null
  }
}

async function handleGenerate() {
  await generateTasks({ use_template: true })
}

// 日付フォーマット
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '未設定'
  const d = new Date(dateStr)
  return d.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  })
}

// 期限超過チェック
function isOverdue(task: { due_at: string | null; status: string }): boolean {
  if (!task.due_at || task.status === 'completed' || task.status === 'skipped') return false
  return new Date(task.due_at) < new Date()
}
</script>

<template>
  <div class="space-y-6">
    <!-- ヘッダー -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">タスク管理</h1>
        <p class="text-sm text-gray-500 mt-1">
          イベントのタスク・締め切りを管理します
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          icon="i-heroicons-sparkles"
          label="自動生成"
          variant="outline"
          @click="handleGenerate"
        />
        <UButton
          icon="i-heroicons-plus"
          label="タスク追加"
          color="primary"
          @click="openCreateModal"
        />
      </div>
    </div>

    <!-- 進捗サマリー -->
    <div class="grid grid-cols-2 md:grid-cols-6 gap-4">
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold">{{ summary.total }}</div>
          <div class="text-xs text-gray-500">全タスク</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-500">{{ summary.pending }}</div>
          <div class="text-xs text-gray-500">未着手</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-500">{{ summary.inProgress }}</div>
          <div class="text-xs text-gray-500">進行中</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-500">{{ summary.completed }}</div>
          <div class="text-xs text-gray-500">完了</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-yellow-500">{{ summary.skipped }}</div>
          <div class="text-xs text-gray-500">スキップ</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-2xl font-bold text-red-500">{{ summary.overdue }}</div>
          <div class="text-xs text-gray-500">期限超過</div>
        </div>
      </UCard>
    </div>

    <!-- 進捗バー -->
    <UProgress :value="calculateProgress(summary)" color="primary" />

    <!-- フィルタ -->
    <div class="flex gap-4">
      <USelectMenu
        v-model="roleFilter"
        :items="[
          { label: '全ロール', value: '' },
          { label: '主催者', value: 'organizer' },
          { label: '会場担当', value: 'venue' },
          { label: '配信担当', value: 'streaming' },
          { label: '企画代行', value: 'event_planner' },
        ]"
        value-key="value"
        placeholder="ロールで絞込"
      />
      <USelectMenu
        v-model="statusFilter"
        :items="[
          { label: '全ステータス', value: '' },
          { label: '未着手', value: 'pending' },
          { label: '進行中', value: 'in_progress' },
          { label: '完了', value: 'completed' },
          { label: 'スキップ', value: 'skipped' },
        ]"
        value-key="value"
        placeholder="ステータスで絞込"
      />
    </div>

    <!-- エラー -->
    <UAlert v-if="error" color="error" :title="error" icon="i-heroicons-exclamation-triangle" />

    <!-- ローディング -->
    <div v-if="isLoading" class="space-y-4">
      <USkeleton v-for="i in 5" :key="i" class="h-16 w-full" />
    </div>

    <!-- タスク一覧 -->
    <UCard v-else-if="tasks.length > 0">
      <div class="divide-y">
        <div
          v-for="t in tasks"
          :key="t.id"
          class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          :class="{ 'bg-red-50': isOverdue(t) }"
        >
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <!-- ステータスボタン -->
            <UButton
              v-if="t.status !== 'completed'"
              icon="i-heroicons-check-circle"
              variant="ghost"
              size="xs"
              color="neutral"
              @click="handleStatusChange(t.id, 'completed')"
            />
            <UIcon
              v-else
              name="i-heroicons-check-circle-solid"
              class="w-5 h-5 text-green-500"
            />

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span
                  class="font-medium truncate"
                  :class="{ 'line-through text-gray-400': t.status === 'completed' || t.status === 'skipped' }"
                >
                  {{ t.title }}
                </span>
                <UBadge :color="getTaskPriorityColor(t.priority as TaskPriority)" variant="subtle" size="xs">
                  {{ getTaskPriorityLabel(t.priority as TaskPriority) }}
                </UBadge>
              </div>
              <div class="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>{{ getTaskRoleLabel(t.assigned_role) }}</span>
                <span v-if="t.relative_day !== null">{{ formatRelativeDay(t.relative_day) }}</span>
                <span :class="{ 'text-red-500 font-medium': isOverdue(t) }">{{ formatDate(t.due_at) }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 ml-4">
            <UBadge :color="getTaskStatusColor(t.status as TaskStatus)" variant="subtle" size="sm">
              {{ getTaskStatusLabel(t.status as TaskStatus) }}
            </UBadge>
            <UButton
              icon="i-heroicons-trash"
              color="error"
              variant="ghost"
              size="xs"
              @click="confirmDelete(t.id)"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- 空状態 -->
    <UCard v-else>
      <div class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <UIcon name="i-heroicons-clipboard-document-list" class="w-12 h-12" />
        </div>
        <h3 class="text-lg font-medium text-gray-900">タスクがありません</h3>
        <p class="text-gray-500 mt-1">テンプレートから自動生成するか、手動でタスクを追加しましょう</p>
        <div class="flex justify-center gap-3 mt-4">
          <UButton icon="i-heroicons-sparkles" label="テンプレートから自動生成" variant="outline" @click="handleGenerate" />
          <UButton icon="i-heroicons-plus" label="手動追加" color="primary" @click="openCreateModal" />
        </div>
      </div>
    </UCard>

    <!-- タスク作成モーダル -->
    <UModal v-model:open="showCreateModal">
      <template #header>
        <h3 class="text-lg font-semibold">タスク追加</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField label="タスク名" required>
            <UInput v-model="form.title" placeholder="企画書作成" />
          </UFormField>
          <UFormField label="説明">
            <UTextarea v-model="form.description" placeholder="タスクの詳細..." :rows="2" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="担当ロール">
              <USelectMenu
                v-model="form.assigned_role"
                :items="[
                  { label: '主催者', value: 'organizer' },
                  { label: '会場担当', value: 'venue' },
                  { label: '配信担当', value: 'streaming' },
                  { label: '企画代行', value: 'event_planner' },
                  { label: '登壇者', value: 'speaker' },
                ]"
                value-key="value"
                placeholder="選択"
              />
            </UFormField>
            <UFormField label="優先度">
              <USelectMenu
                v-model="form.priority"
                :items="[
                  { label: '高', value: 'high' },
                  { label: '中', value: 'medium' },
                  { label: '低', value: 'low' },
                ]"
                value-key="value"
              />
            </UFormField>
          </div>
          <UFormField label="相対日（D-30=-30, D+1=1）">
            <UInput v-model.number="form.relative_day" type="number" placeholder="-7" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton label="キャンセル" variant="ghost" @click="showCreateModal = false" />
          <UButton label="追加" color="primary" :loading="isLoading" @click="handleCreate" />
        </div>
      </template>
    </UModal>

    <!-- 削除確認モーダル -->
    <UModal v-model:open="showDeleteConfirm">
      <template #header>
        <h3 class="text-lg font-semibold">タスク削除の確認</h3>
      </template>
      <template #body>
        <p>このタスクを削除してもよろしいですか？この操作は取り消せません。</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton label="キャンセル" variant="ghost" @click="showDeleteConfirm = false" />
          <UButton label="削除" color="error" @click="handleDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
