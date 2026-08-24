import { Router, type IRouter } from "express";
import healthRouter from "./health";
import searchRouter from "./search";
import proxyRouter from "./proxy";
import faviconRouter from "./favicon";

const router: IRouter = Router();

router.use(healthRouter);
router.use(searchRouter);
router.use(faviconRouter);
router.use(proxyRouter);

export default router;
