import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zltizgldhzmrtdnpewmm.supabase.co'
const supabaseKey = 'sb_publishable_2LoitJ2WOehjl5MLuQuNDQ_-gr64r_nsb_secret_BsOypEm51rv8mtbCOkxoVQ_tIibM4lW'

export const supabase = createClient(supabaseUrl, supabaseKey)