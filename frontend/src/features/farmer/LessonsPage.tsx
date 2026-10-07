import { Play } from "lucide-react"
import { useTranslation } from "react-i18next"
import { getLessons } from "@/api/farmer"
import { Button } from "@/components/ui/button"
import { promptAudio } from "@/lib/audio"
import { speak } from "@/lib/speech"
import { NoDataYet } from "./DataStatus"
import { FarmerPage } from "./FarmerPage"
import { useServerData } from "./useServerData"

type LessonId =
  | "dry-grain-storage"
  | "fall-armyworm-signs"
  | "maize-spacing"
  | "compost-at-home"
  | "selling-together"
  | "mobile-money-safety"

/** Plays the lesson's recording; until one exists for the language, the device voice reads it. */
function play(id: string, text: string) {
  if (typeof Audio === "undefined") return speak(text)
  new Audio(promptAudio(`lessons.${id}`)).play().catch(() => speak(text))
}

/** Lessons: short audio lessons on storage, pests, planting, soil, selling and money. */
export function Component() {
  const { t } = useTranslation()
  const state = useServerData("lessons", getLessons)
  const lessons = state.data

  return (
    <FarmerPage
      title={t("farmerApp.lessons.title")}
      source={lessons?.source}
      state={state}
    >
      <p className="text-base text-muted-foreground">
        {t("farmerApp.lessons.intro")}
      </p>
      {!lessons ? (
        <NoDataYet state={state} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {lessons.lessons.map((lesson) => {
            const id = lesson.id as LessonId
            const title = t(`farmerApp.lessons.items.${id}.title`)
            const summary = t(`farmerApp.lessons.items.${id}.summary`)
            return (
              <li
                key={lesson.id}
                className="flex flex-col gap-3 rounded-[20px] border bg-card p-5"
              >
                <span className="self-start rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
                  {t(`farmerApp.lessons.topics.${lesson.topic}`)} ·{" "}
                  {t("farmerApp.lessons.minutes", { count: lesson.minutes })}
                </span>
                <h2 className="text-lg font-medium text-foreground">{title}</h2>
                <p className="flex-1 text-sm text-muted-foreground">
                  {summary}
                </p>
                <Button
                  size="xl"
                  variant="secondary"
                  className="self-start text-primary"
                  onClick={() => play(lesson.id, `${title}. ${summary}`)}
                >
                  <Play aria-hidden />
                  {t("common.listenShort")}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </FarmerPage>
  )
}
