// VENUE-001-004: 会場一覧取得 API
// GET /api/v1/venues
// 仕様書: §5 Venue API - GET /api/v1/venues
import { createCrudHandlers } from '~/server/utils/crud'
import { venue } from '~/server/database/schema'

const { list } = createCrudHandlers({
  table: venue as never,
  resourceName: '会場',
  permissionResource: 'venue',
})

export default list
