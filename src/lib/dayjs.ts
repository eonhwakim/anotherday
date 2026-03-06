import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import isoWeek from 'dayjs/plugin/isoWeek';
import minMax from 'dayjs/plugin/minMax';

// 주 단위를 월~일(ISO 8601) 기준으로 설정
dayjs.extend(isoWeek);
dayjs.extend(minMax);
dayjs.locale('ko');

export default dayjs;
