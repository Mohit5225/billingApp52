# Centralized configuration for all API rate limits
# Using slowapi format (e.g., "5/minute", "100/day")

# Rapid API (GST verification) - Strict limits due to paid API usage
LIMIT_RAPID_API = "5/day"

# Heavy Excel File Parsing and generation
LIMIT_FILE_UPLOADS = "5/minute"
LIMIT_EXPORTS = "5/minute"

# Maximum Excel upload file size in bytes (10 MB)
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

# Database intensive operations
LIMIT_AGGREGATIONS = "10/minute"

# Financial Write Operations (Voucher creations/edits)
LIMIT_VOUCHER_WRITES = "15/minute"

# Permissive global limit for all other standard CRUD operations
# Set to 35/minute as requested by user to allow normal app usage
LIMIT_GLOBAL = "35/minute"
