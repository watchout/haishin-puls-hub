// VENUE-001-004: 会場詳細取得 API
// GET /api/v1/venues/:id
// 仕様書: §5 Venue API - GET /api/v1/venues/:id
import { createCrudHandlers } from '~/server/utils/crud'
import { venue } from '~/server/database/schema'

const { get } = createCrudHandlers({
  table: venue as never,
  resourceName: '会場',
  permissionResource: 'venue',
})

export default get
