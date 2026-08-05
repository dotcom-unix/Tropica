import { Router, type IRouter } from "express";
import healthRouter from "./health";
import searchRouter from "./search";
import proxyRouter from "./proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(searchRouter);
router.use(proxyRouter);

export default router;
