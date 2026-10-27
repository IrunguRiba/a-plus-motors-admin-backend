
const express = require('express');
const multer = require('multer');
const controller = require('../controllers/car');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const uploadFields = upload.fields([
  { name: 'photos',    maxCount: 20 },
  { name: 'documents', maxCount: 20 },
]);
router.post('/', uploadFields, controller.createCar);

router.get('/all', controller.findAll)
router.post('/find', controller.findById);
router.get('/:id', controller.findById);
router.patch('/update', uploadFields, controller.updateCar);
router.post('/search', controller.searchCar);
router.delete('/delete', controller.deleteCar);
module.exports = router;