import {
  getVoucherConfig as getVoucherConfigService,
  listVouchers as listVouchersService,
  updateVoucherConfig as updateVoucherConfigService,
} from "../services/voucher.service.js";

export async function listVouchers(req, res, next) {
  try {
    const vouchers = await listVouchersService({ userId: req.user.id });
    res.json(vouchers);
  } catch (err) {
    next(err);
  }
}

export async function getVoucherConfig(_req, res, next) {
  try {
    const config = await getVoucherConfigService();
    res.json(config);
  } catch (err) {
    next(err);
  }
}

export async function updateVoucherConfig(req, res, next) {
  try {
    const config = await updateVoucherConfigService(req.body);
    res.json(config);
  } catch (err) {
    next(err);
  }
}
