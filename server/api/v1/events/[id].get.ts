// EVT-001-005 §5: GET /api/v1/events/:id - イベント詳細取得
import { createCrudHandlers } from '~/server/utils/crud'
import { event } from '~/server/database/schema'

const { get } = createCrudHandlers({
  table: event as never,
  resourceName: 'イベント',
  permissionResource: 'event',
})

export default get
