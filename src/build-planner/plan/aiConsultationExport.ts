import { EQUIPMENT_BOTTOM_SLOTS, EQUIPMENT_TOP_SLOTS } from '../equipment/equipmentData';
import {
  enchantsData,
  resolveEnchantSelection,
} from '../equipment/equipmentSlotPickerData';
import {
  calcEffectTotalLink,
  formatEffectDesc,
  getEffectLevel,
  getModById,
  modulesData,
} from '../module/moduleData';
import { factorBaseName, getFactorEffectDesc } from '../phantom/phantomView';
import {
  getActivePhantomNodeIds,
  getUnlockLevel,
  pfData,
  stData,
} from '../phantom/phantomData';
import { PROFESSIONS, formatProfessionLabel } from '../profession';
import { getBattleImagineData } from '../skill/skillData';
import { INSPIRATION_PERCENT_STAT_IDS, POWER_CORE_EFFECT_IDS } from '../stats/cookingBuff';
import { computeStatsBundle } from '../store/derivedSelectors';
import type { BuildStore } from '../store/types';
import type { EquipmentSlotId, StatId } from '../types';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface AiConsultationExportOptions {
  shareUrl: string;
  t: Translate;
  tGame: Translate;
}

const EQUIPMENT_SLOTS: EquipmentSlotId[] = [
  'weapon',
  ...EQUIPMENT_TOP_SLOTS,
  ...EQUIPMENT_BOTTOM_SLOTS,
];

const roundForExport = (value: number): number => Math.trunc(value * 100) / 100;

function highestStatId(values: Record<StatId, number>): StatId {
  let highest = INSPIRATION_PERCENT_STAT_IDS[0];
  for (const statId of INSPIRATION_PERCENT_STAT_IDS.slice(1)) {
    if (values[statId] > values[highest]) highest = statId;
  }
  return highest;
}

function compactBreakdown(entry: {
  base: number;
  additive: number;
  multiplier: number;
  cookingBonus?: number;
  levelBonus?: number;
}) {
  return {
    base: entry.base,
    levelBonus: entry.levelBonus ?? 0,
    additive: entry.additive,
    multiplierPercent: roundForExport((entry.multiplier - 1) * 100),
    additionalBuff: entry.cookingBonus ?? 0,
  };
}

/**
 * 現在のPlannerが計算済みの値と構成を、通常Chatへ貼り付けられる安定したJSONへ整形する。
 * 数値計算はここでは行わず、computeStatsBundle()のUIと同じ結果を唯一の入力元にする。
 */
export function buildAiConsultationText(
  state: BuildStore,
  { shareUrl, t, tGame }: AiConsultationExportOptions,
): string {
  const bundle = computeStatsBundle(state);
  const profession = PROFESSIONS[state.professionKey];
  const attackStatId: StatId = profession.attackType === 'physical' ? 'atk' : 'matk';
  const fiveRawStats: Record<StatId, number> = {
    ...bundle.rawStats,
    haste: bundle.derivedStats.hasteReal,
  };
  const highestByRaw = highestStatId(fiveRawStats);
  const highestByFinalPercent = highestStatId(bundle.stats);
  const lifeWaveLevel = getEffectLevel(
    POWER_CORE_EFFECT_IDS.lifeWave,
    calcEffectTotalLink(POWER_CORE_EFFECT_IDS.lifeWave, state.moduleSlots),
  );
  const breakdownStatIds: StatId[] = [
    'maxHp',
    attackStatId,
    profession.mainStat,
    'endurance',
    ...INSPIRATION_PERCENT_STAT_IDS,
  ];
  const phantomTemplate =
    state.phantomTemplateId == null
      ? undefined
      : stData.templates[String(state.phantomTemplateId)];
  const activePhantomNodeIds = phantomTemplate
    ? [
        ...getActivePhantomNodeIds(
          phantomTemplate.rootNodeId,
          state.phantomTemplateId!,
          state.phantomNodeSelections,
        ),
      ]
    : [];

  const tgAttrDesc = (key: string) =>
    tGame(`attrDescs.${key}`, { defaultValue: `attrDescs.${key}` });
  const tgAttr = (key: string) => tGame(`attributes.${key}`, { defaultValue: key });
  const tStat = (key: string) =>
    t(`buildPlanner.stats.${key}`, { defaultValue: key });

  const modules = state.moduleSlots.map((config, index) => {
    if (!config) return { slot: index + 1, empty: true };
    const mod = getModById(config.modId);
    return {
      slot: index + 1,
      id: config.modId,
      type: mod?.modType ?? null,
      typeKey:
        mod?.modType === 1
          ? 'attack'
          : mod?.modType === 2
            ? 'support'
            : mod?.modType === 3
              ? 'defense'
              : null,
      quality: mod?.quality ?? null,
      holes: config.holes.map((hole, holeIndex) => {
        if (hole.effectId == null) {
          return { hole: holeIndex + 1, effectId: null, linkCount: hole.linkCount };
        }
        const totalLinkCount = calcEffectTotalLink(hole.effectId, state.moduleSlots);
        const activeLevel = getEffectLevel(hole.effectId, totalLinkCount);
        const levelData = modulesData.effects[String(hole.effectId)]?.levels[activeLevel];
        return {
          hole: holeIndex + 1,
          effectId: hole.effectId,
          effectName: tGame(`moduleEffects.${hole.effectId}`, {
            defaultValue: String(hole.effectId),
          }),
          linkCount: hole.linkCount,
          totalLinkCount,
          activeLevel,
          activeEffects: levelData
            ? formatEffectDesc(levelData[2], levelData[3] ?? [], tgAttrDesc, tgAttr, tStat)
            : [],
        };
      }),
    };
  });

  const equipment = EQUIPMENT_SLOTS.map((slot) => {
    const item = state.equipped[slot];
    if (!item) return { slot, empty: true };
    const enchantId = state.slotEnchants[slot];
    const enchantList = item.enchantId ? enchantsData[String(item.enchantId)] ?? [] : [];
    const enchant = resolveEnchantSelection(enchantList, enchantId);
    return {
      slot,
      id: item.id,
      name: tGame(`items.${item.id}.name`, { defaultValue: String(item.id) }),
      equipmentScore: item.equipGs,
      refineLevel: state.refineLevels[slot] ?? 0,
      completionPercent: state.perfectlines[slot] ?? 0,
      evolution: {
        selectedStats: state.evolutionStats[slot] ?? [],
        dataEffects: item.evo.map(([attrId, min, max]) => ({
          attrId,
          name: tgAttr(String(attrId)),
          min,
          max,
        })),
        fixedEffects:
          item.fixedEvolutionStats[
            String(profession.talentSchoolIds[state.professionTypeKey === 'type1' ? 0 : 1])
          ]?.map(([effectType, attrId, min, max, isPercent]) => ({
            effectType,
            attrId,
            name: tgAttr(String(attrId)),
            min,
            max,
            isPercent,
          })) ?? [],
      },
      legendaryAffix: state.legendaryAffixState[slot]
        ? {
            ...state.legendaryAffixState[slot],
            name: tgAttr(String(state.legendaryAffixState[slot]!.attrId)),
          }
        : null,
      legendaryAffixGroups: (state.legendaryAffixGroupState[slot] ?? []).map((affix) =>
        affix
          ? { ...affix, name: tgAttr(String(affix.attrId)) }
          : null,
      ),
      enchant:
        enchantId == null
          ? null
          : {
              id: enchantId,
              name: tGame(`items.${enchantId}.name`, { defaultValue: String(enchantId) }),
              grade: enchant.grade,
              effects: (enchant.data?.effects ?? []).map(([attrId, value]) => ({
                attrId,
                name: tgAttr(String(attrId)),
                value,
              })),
            },
    };
  });

  const battleImagines = state.battleImagines.map((id, index) => {
    if (id == null) return { slot: index + 1, empty: true };
    const data = getBattleImagineData(id);
    return {
      slot: index + 1,
      id,
      name: tGame(`battleImagines.${id}.name`, { defaultValue: String(id) }),
      rank: state.imagineRanks[index] ?? 0,
      passiveEffects: (data?.passiveEffects ?? []).map(([attrId, ...rankValues]) => ({
        attrId,
        name: tgAttr(String(attrId)),
        value: rankValues[state.imagineRanks[index] ?? 0] ?? null,
      })),
      buffPassiveEffects: data?.bufPassiveEffects ?? [],
    };
  });

  const phantomFactors = Object.entries(state.phantomFactorSlots).flatMap(([groupId, factor]) =>
    factor == null
      ? []
      : [
          {
            groupId: Number(groupId),
            classKey: factor.classKey,
            name: factorBaseName(tGame, factor.classKey),
            grade: factor.grade,
            itemId: pfData.byClass[factor.classKey]?.grades[factor.grade - 1]?.id ?? null,
            effect: getFactorEffectDesc(tGame, factor.classKey, factor.grade),
          },
        ],
  );

  const result = {
    schemaVersion: 1,
    plannerVersion: __APP_VERSION__,
    shareUrl,
    profession: {
      key: state.professionKey,
      type: state.professionTypeKey,
      label: formatProfessionLabel(state.professionKey, state.professionTypeKey, tGame),
      attackType: profession.attackType,
      mainStat: profession.mainStat,
    },
    stats: {
      main: {
        maxHp: bundle.stats.maxHp,
        attack: { stat: attackStatId, value: bundle.stats[attackStatId] },
        mainStat: { stat: profession.mainStat, value: bundle.stats[profession.mainStat] },
        endurance: bundle.stats.endurance,
        illusionPower: bundle.stats.illusionPower,
      },
      five: Object.fromEntries(
        INSPIRATION_PERCENT_STAT_IDS.map((statId) => [
          statId,
          {
            raw: fiveRawStats[statId],
            percent: roundForExport(bundle.stats[statId]),
          },
        ]),
      ),
      derived: {
        attackSpeedPercent: roundForExport(bundle.derivedStats.atkSpeedPercent),
        castSpeedPercent: roundForExport(bundle.derivedStats.castSpeedPercent),
      },
      breakdowns: Object.fromEntries(
        breakdownStatIds.map((statId) => [
          statId,
          {
            current: roundForExport(bundle.stats[statId]),
            ...compactBreakdown(bundle.rawStatsBreakdown[statId]),
          },
        ]),
      ),
    },
    conditional: {
      highestFiveStatByRawValue: highestByRaw,
      highestFiveStatByFinalPercent: highestByFinalPercent,
      plannerSelectedHighestRawTarget: bundle.highestRawConditionalTarget,
      lifeWave: {
        enabled: state.cookingBuff.lifeWaveEnabled,
        activeLevel: lifeWaveLevel,
        target: bundle.lifeWaveTarget,
      },
    },
    modules,
    equipment,
    battleImagines,
    phantomProjection: {
      enabled: state.phantomEnabled,
      level: state.phantomLevel,
      templateId: state.phantomTemplateId,
      templateName:
        state.phantomTemplateId == null
          ? null
          : tGame(`seasonTalents.templates.${state.phantomTemplateId}`, {
              defaultValue: String(state.phantomTemplateId),
            }),
      bondPoints: state.phantomBondPoints,
      selectedNodeIds: Object.values(state.phantomNodeSelections),
      activeNodes: activePhantomNodeIds.map((nodeId) => {
        const node = stData.treeNodes[String(nodeId)];
        const ordinaryEffect = stData.ordinaryEffects[String(nodeId)];
        return {
          nodeId,
          nodeType: node?.nodeType ?? null,
          unlocked: node ? state.phantomLevel >= getUnlockLevel(node.unlockCondition) : false,
          effects: ordinaryEffect?.effects ?? [],
        };
      }),
      factors: phantomFactors,
      templateExists: phantomTemplate != null,
    },
  };

  return `BPSR Build Planner AI Export\n${JSON.stringify(result, null, 2)}`;
}
