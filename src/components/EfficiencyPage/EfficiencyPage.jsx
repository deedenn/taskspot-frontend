import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  InfoCircleOutlined,
  MinusOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  TrophyOutlined,
  UnorderedListOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Button, Card, Modal, Progress, Segmented, Skeleton, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { PageState } from "../PageState/PageState.jsx";
import "./EfficiencyPage.css";

const factorMeta = {
  timeliness: {
    label: "Соблюдение сроков",
    description: "Задачи, переданные на проверку до конца дня срока",
    icon: <ClockCircleOutlined />,
    tone: "blue"
  },
  delivery: {
    label: "Доведение до результата",
    description: "Задачи со сроком, которые дошли до проверки",
    icon: <RocketOutlined />,
    tone: "cyan"
  },
  checklist: {
    label: "Дисциплина чек-листов",
    description: "Завершённые пункты и регулярность работы с ними",
    icon: <UnorderedListOutlined />,
    tone: "amber"
  },
  quality: {
    label: "Качество сдачи",
    description: "Задачи, принятые без возврата на доработку",
    icon: <SafetyCertificateOutlined />,
    tone: "green"
  }
};

const achievementIcons = {
  deadline: <ClockCircleOutlined />,
  checklist: <UnorderedListOutlined />,
  quality: <SafetyCertificateOutlined />,
  captain: <TeamOutlined />
};

function scoreText(value) {
  return value == null ? "—" : Math.round(value);
}

function Delta({ value }) {
  if (value == null) return <span className="efficiency-delta efficiency-delta--neutral"><MinusOutlined /> нет сравнения</span>;
  if (value === 0) return <span className="efficiency-delta efficiency-delta--neutral"><MinusOutlined /> без изменений</span>;
  const positive = value > 0;
  return (
    <span className={`efficiency-delta efficiency-delta--${positive ? "positive" : "negative"}`}>
      {positive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
      {positive ? "+" : ""}{value} п.п.
    </span>
  );
}

function ScoreRing({ score, label }) {
  const safeScore = score == null ? 0 : Math.max(0, Math.min(100, score));
  return (
    <div
      className="efficiency-score-ring"
      style={{ "--efficiency-score": `${safeScore * 3.6}deg` }}
      role="img"
      aria-label={`${label}: ${score == null ? "недостаточно данных" : `${score}%`}`}
    >
      <div className="efficiency-score-ring__inside">
        <strong>{scoreText(score)}</strong>
        <span>{score == null ? "нет данных" : "%"}</span>
      </div>
    </div>
  );
}

function ScoreCard({ data, kind }) {
  const isPersonal = kind === "personal";
  return (
    <Card className={`efficiency-score-card efficiency-score-card--${kind}`}>
      <div className="efficiency-score-card__head">
        <div className="efficiency-score-card__eyebrow">
          {isPersonal ? <UserOutlined /> : <TeamOutlined />}
          {isPersonal ? "Личная эффективность" : "Эффективность команды"}
        </div>
        <Tag bordered={false}>{data.confidence.label}</Tag>
      </div>
      <div className="efficiency-score-card__body">
        <ScoreRing score={data.score} label={isPersonal ? "Личная эффективность" : "Эффективность команды"} />
        <div className="efficiency-score-card__copy">
          <span className="efficiency-score-card__band">{data.band.label}</span>
          <Delta value={data.delta} />
          <span className="efficiency-score-card__comparison">
            Прошлый период: {data.previousScore == null ? "—" : `${data.previousScore}%`}
          </span>
        </div>
      </div>
      <div className="efficiency-score-card__foot">
        <span><strong>{data.stats.sampleSize}</strong> задач в выборке</span>
        {isPersonal ? (
          <span className="efficiency-score-card__xp"><FireOutlined /> <strong>{data.xp} XP</strong> за период</span>
        ) : (
          <span><strong>{data.projects}</strong> ваших проектов</span>
        )}
      </div>
    </Card>
  );
}

function evidenceText(factor) {
  const { evidence } = factor;
  if (factor.value == null) return "Пока недостаточно событий";
  if (factor.key === "timeliness") return `${evidence.positive} из ${evidence.total} обязательств выполнено вовремя`;
  if (factor.key === "delivery") return `${evidence.positive} из ${evidence.total} обязательств дошло до проверки`;
  if (factor.key === "checklist") return `${evidence.positive} из ${evidence.total} пунктов · ${evidence.actions} действий`;
  return `${evidence.positive} из ${evidence.total} сдач без возврата`;
}

function FactorCard({ factor, previous }) {
  const meta = factorMeta[factor.key];
  const previousValue = previous?.value;
  const delta = factor.value == null || previousValue == null ? null : Math.round((factor.value - previousValue) * 10) / 10;
  return (
    <article className={`efficiency-factor efficiency-factor--${meta.tone}`}>
      <div className="efficiency-factor__top">
        <span className="efficiency-factor__icon" aria-hidden="true">{meta.icon}</span>
        <span className="efficiency-factor__weight">вес {factor.weight}%</span>
      </div>
      <div className="efficiency-factor__title">
        <div>
          <h3>{meta.label}</h3>
          <p>{meta.description}</p>
        </div>
        <strong>{factor.value == null ? "—" : `${Math.round(factor.value)}%`}</strong>
      </div>
      <Progress percent={factor.value || 0} showInfo={false} strokeColor="currentColor" trailColor="var(--border-subtle)" />
      <div className="efficiency-factor__evidence">
        <span>{evidenceText(factor)}</span>
        {delta != null && <span className={delta >= 0 ? "is-positive" : "is-negative"}>{delta > 0 ? "+" : ""}{delta} п.п.</span>}
      </div>
    </article>
  );
}

function RhythmChart({ items, period }) {
  const maxValue = Math.max(1, ...items.flatMap((item) => [item.submissions, item.checklistActions]));
  const summary = items.map((item) => `${item.submissions} сдач, ${item.checklistActions} действий с чек-листами`).join("; ");
  return (
    <div className="efficiency-rhythm" style={{ "--rhythm-columns": items.length }} role="img" aria-label={`Ритм работы: ${summary}`}>
      {items.map((item) => {
        const from = dayjs(item.from);
        const to = dayjs(item.to).subtract(1, "millisecond");
        const label = period === "week" ? from.format("dd") : `${from.format("D")}–${to.format("D MMM")}`;
        return (
          <div className="efficiency-rhythm__column" key={item.key} title={`${label}: сдач — ${item.submissions}, действий с чек-листами — ${item.checklistActions}`}>
            <div className="efficiency-rhythm__values">
              <span>{item.submissions || ""}</span><span>{item.checklistActions || ""}</span>
            </div>
            <div className="efficiency-rhythm__bars">
              <span className="efficiency-rhythm__bar efficiency-rhythm__bar--delivery" style={{ height: `${Math.max(item.submissions ? 12 : 2, item.submissions / maxValue * 100)}%` }} />
              <span className="efficiency-rhythm__bar efficiency-rhythm__bar--checklist" style={{ height: `${Math.max(item.checklistActions ? 12 : 2, item.checklistActions / maxValue * 100)}%` }} />
            </div>
            <span className="efficiency-rhythm__label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Achievements({ items }) {
  return (
    <div className="efficiency-achievements">
      {items.map((item) => (
        <article className={`efficiency-achievement ${item.unlocked ? "is-unlocked" : ""}`} key={item.key}>
          <span className="efficiency-achievement__icon" aria-hidden="true">{achievementIcons[item.key]}</span>
          <div>
            <div className="efficiency-achievement__title">
              <strong>{item.title}</strong>
              {item.unlocked && <CheckCircleOutlined aria-label="Получено" />}
            </div>
            <p>{item.description}</p>
            <Progress percent={item.progress} showInfo={false} size="small" strokeColor={item.unlocked ? "var(--success)" : "var(--brand-blue-500)"} />
            <span>{item.unlocked ? `Достижение получено · ${item.progressLabel || `${item.current} из ${item.target}`}` : item.progressLabel || `${item.current} из ${item.target}`}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function EfficiencySkeleton() {
  return (
    <div className="efficiency-page__skeleton" aria-label="Загрузка эффективности">
      <Skeleton active paragraph={{ rows: 2 }} />
      <div><Skeleton.Node active /><Skeleton.Node active /></div>
      <Skeleton active paragraph={{ rows: 6 }} />
    </div>
  );
}

export function EfficiencyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPeriod = searchParams.get("period");
  const period = requestedPeriod === "month" ? "month" : "week";
  const [scope, setScope] = useState("personal");
  const [methodOpen, setMethodOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await apiFetch(`/reports/efficiency?period=${period}`));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = data?.[scope];
  const previousByKey = useMemo(
    () => new Map((selected?.previousFactors || []).map((factor) => [factor.key, factor])),
    [selected]
  );

  function changePeriod(value) {
    const next = new URLSearchParams(searchParams);
    if (value === "week") next.delete("period");
    else next.set("period", value);
    setSearchParams(next, { replace: true });
  }

  return (
    <section className="efficiency-page">
      <header className="efficiency-page__header">
        <div>
          <Typography.Title level={1}>Эффективность</Typography.Title>
          <Typography.Paragraph>Объективный ритм работы: сроки, результат, чек-листы и качество сдачи.</Typography.Paragraph>
        </div>
        <div className="efficiency-page__controls">
          <Segmented
            aria-label="Период эффективности"
            value={period}
            onChange={changePeriod}
            options={[{ label: "7 дней", value: "week" }, { label: "30 дней", value: "month" }]}
          />
          <Button icon={<InfoCircleOutlined aria-hidden="true" />} onClick={() => setMethodOpen(true)}>Как считается</Button>
        </div>
      </header>

      {error && <PageState type="error" description={error} onAction={load} />}
      {loading && <EfficiencySkeleton />}

      {!loading && !error && data && (
        <>
          <div className="efficiency-page__score-grid">
            <ScoreCard data={data.personal} kind="personal" />
            <ScoreCard data={data.team} kind="team" />
          </div>

          <section className="efficiency-section" aria-labelledby="efficiency-factors-title">
            <div className="efficiency-section__head">
              <div>
                <span className="efficiency-section__kicker">Профиль результата</span>
                <Typography.Title id="efficiency-factors-title" level={2}>Что формирует индекс</Typography.Title>
              </div>
              <Segmented
                aria-label="Область показателей"
                value={scope}
                onChange={setScope}
                options={[{ label: "Мой вклад", value: "personal" }, { label: "Моя команда", value: "team" }]}
              />
            </div>
            <div className="efficiency-factors">
              {selected.factors.map((factor) => (
                <FactorCard key={factor.key} factor={factor} previous={previousByKey.get(factor.key)} />
              ))}
            </div>
            <div className="efficiency-next-action">
              <span className="efficiency-next-action__icon"><RocketOutlined /></span>
              <div>
                <span>Следующий лучший шаг</span>
                <strong>{selected.nextAction.title}</strong>
                <p>{selected.nextAction.description}</p>
              </div>
            </div>
          </section>

          <div className="efficiency-page__lower-grid">
            <Card className="efficiency-panel">
              <div className="efficiency-panel__head">
                <div>
                  <span className="efficiency-section__kicker">Личный ритм</span>
                  <Typography.Title level={2}>Движение по периоду</Typography.Title>
                </div>
              </div>
              <div className="efficiency-rhythm__legend">
                <span><i className="is-delivery" /> Передано на проверку</span>
                <span><i className="is-checklist" /> Действия с чек-листами</span>
              </div>
              <RhythmChart items={data.rhythm} period={period} />
            </Card>

            <Card className="efficiency-panel">
              <div className="efficiency-panel__head">
                <div>
                  <span className="efficiency-section__kicker">Коллекция</span>
                  <Typography.Title level={2}>Достижения периода</Typography.Title>
                </div>
                <TrophyOutlined className="efficiency-panel__trophy" />
              </div>
              <Achievements items={data.achievements} />
            </Card>
          </div>
        </>
      )}

      <Modal title="Как Taskspot считает эффективность" open={methodOpen} onCancel={() => setMethodOpen(false)} footer={<Button type="primary" onClick={() => setMethodOpen(false)}>Понятно</Button>}>
        <div className="efficiency-methodology">
          <p>Индекс строится только на событиях задач и сравнивается с равным предыдущим периодом.</p>
          <ol>
            <li><strong>40% — соблюдение сроков.</strong> Доля задач со сроком в периоде, переданных на проверку не позднее конца дня срока.</li>
            <li><strong>25% — доведение до результата.</strong> Доля обязательств периода, которые дошли до проверки.</li>
            <li><strong>20% — чек-листы.</strong> Завершённость пунктов с небольшим бонусом за регулярные отметки по ходу работы.</li>
            <li><strong>15% — качество.</strong> Доля сдач без возврата на доработку.</li>
          </ol>
          <p>Если для компонента нет данных, он не получает автоматические 100% и не влияет на итог. Перенос уже просроченного срока не стирает обязательство. «Команда» включает только проекты, созданные вами.</p>
        </div>
      </Modal>
    </section>
  );
}
