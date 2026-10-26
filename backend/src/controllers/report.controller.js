import { getBusinessReport as getBusinessReportService } from "../services/report.service.js";

export async function getBusinessReport(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query;
    const report = await getBusinessReportService({
      from: query.from,
      to: query.to,
    });
    res.json(report);
  } catch (err) {
    next(err);
  }
}
