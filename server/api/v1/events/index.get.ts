// EVT-001-005 §5: GET /api/v1/events - イベント一覧取得
import { createCrudHandlers } from '~/server/utils/crud'
import { event } from '~/server/database/schema'

const { list } = createCrudHandlers({
  table: event as never,
  resourceName: 'イベント',
  permissionResource: 'event',
})

export default list
