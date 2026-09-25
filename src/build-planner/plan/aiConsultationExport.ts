import {
  classifyEvoDisplay,
  EQUIPMENT_BOTTOM_SLOTS,
  EQUIPMENT_TOP_SLOTS,
  getMaxPerfectline,
  getTalentSchoolId,
} from '../equipment/equipmentData';
import {
  enchantsData,
  resolveEnchantSelection,
} from '../equipment/equipmentSlotPickerData';
import {
  calcEffectTotalLink,
  collectEquippedEffects,
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
import {
  EVO_ATTR_TO_STAT,
  EVO_PCT_ATTR_TO_STAT,
  EVO_PCT_FINAL_ATTR_TO_STAT,
} from '../stats/attrMaps';
import { INSPIRATION_PERCENT_STAT_IDS, POWER_CORE_EFFECT_IDS } from '../stats/cookingBuff';
import { calcStatValue } from '../stats/statValue';
import { computeStatsBundle } from '../store/derivedSelectors';
import type { BuildStore } from '../store/types';
import type { EquipmentSlotId, StatId } from '../types';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface AiConsultationExportOptions {
  shareUrl: string;
  t: Translate;
  tGame: Translate;
}

export type AiExportProfile = 'compact' | 'debug';

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
function buildAiExportSnapshot(
  state: BuildStore,
  { shareUrl, t, tGame }: AiConsultationExportOptions,
) {
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
  const stripGameMarkup = (text: string) => text.replace(/<\/?style(?:="[^"]*")?>/g, '');

  const resolveEffectiveEvolution = (
    item: BuildStore['equipped'][EquipmentSlotId],
    slot: EquipmentSlotId,
  ) => {
    if (!item) return { evolution: [], reforge: null };
    const talentSchoolId = getTalentSchoolId(profession, state.professionTypeKey);
    const { kind, fixedEvoEffects } = classifyEvoDisplay(item, talentSchoolId);
    const maxPerfectline = getMaxPerfectline(item);
    const perfectline = Math.min(state.perfectlines[slot] ?? maxPerfectline, maxPerfectline);
    const selectedStats = state.evolutionStats[slot] ?? [];
    const evolution: Array<{
      source: 'fixed' | 'dataEvo' | 'selected';
      stat: StatId;
      name: string;
      value: number;
      unit: 'flat' | 'percent';
    }> = [];

    if (fixedEvoEffects) {
      for (const [effectType, attrId, min, max, isPercent] of fixedEvoEffects) {
        if (effectType === 3) continue;
        const stat =
          EVO_PCT_FINAL_ATTR_TO_STAT[attrId] ??
          (isPercent ? EVO_PCT_ATTR_TO_STAT[attrId] : EVO_ATTR_TO_STAT[attrId]);
        if (!stat) continue;
        const rawValue = calcStatValue(min, max, perfectline);
        evolution.push({
          source: 'fixed',
          stat,
          name: tgAttr(String(attrId)),
          value: isPercent ? roundForExport(rawValue / 100) : Math.round(rawValue),
          unit: isPercent ? 'percent' : 'flat',
        });
      }
    } else if (kind === 'dataEvo') {
      for (const [attrId, min, max] of item.evo.slice(0, 2)) {
        const stat = EVO_ATTR_TO_STAT[attrId];
        if (!stat) continue;
        evolution.push({
          source: 'dataEvo',
          stat,
          name: tgAttr(String(attrId)),
          value: Math.round(calcStatValue(min, max, perfectline)),
          unit: 'flat',
        });
      }
    } else {
      for (let index = 0; index <= 1; index++) {
        const stat = selectedStats[index];
        const evo = item.evo[index];
        if (!stat || !evo) continue;
        evolution.push({
          source: 'selected',
          stat,
          name: tStat(stat),
          value: Math.round(calcStatValue(evo[1], evo[2], perfectline)),
          unit: 'flat',
        });
      }
    }

    const reforgeStat = kind === 'seriesFixed' ? undefined : selectedStats[2];
    const reforge =
      reforgeStat && item.reforgeEvoMax > 0
        ? {
            stat: reforgeStat,
            name: tStat(reforgeStat),
            value: Math.round(
              calcStatValue(item.reforgeEvoMin, item.reforgeEvoMax, perfectline),
            ),
            unit: 'flat' as const,
          }
        : null;

    return { evolution, reforge };
  };

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

  const activeModuleEffects = [...collectEquippedEffects(state.moduleSlots)].flatMap(
    ([effectId, totalLinkCount]) => {
      const activeLevel = getEffectLevel(effectId, totalLinkCount);
      if (activeLevel === 0) return [];
      const levelData = modulesData.effects[String(effectId)]?.levels[activeLevel];
      return [
        {
          effectId,
          effectName: tGame(`moduleEffects.${effectId}`, { defaultValue: String(effectId) }),
          totalLinkCount,
          activeLevel,
          activeEffects: levelData
            ? formatEffectDesc(levelData[2], levelData[3] ?? [], tgAttrDesc, tgAttr, tStat)
            : [],
        },
      ];
    },
  );

  const equipment = EQUIPMENT_SLOTS.map((slot) => {
    const item = state.equipped[slot];
    if (!item) return { slot, empty: true };
    const effectiveEvolution = resolveEffectiveEvolution(item, slot);
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
      effectiveEvolution: effectiveEvolution.evolution,
      effectiveReforge: effectiveEvolution.reforge,
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
    const rank = state.imagineRanks[index] ?? 0;
    const passiveBuffDescriptionsValue = tGame(`battleImagines.${id}.passiveBufDescriptions`, {
      returnObjects: true,
      defaultValue: [],
    }) as unknown;
    const passiveBuffDescriptions = Array.isArray(passiveBuffDescriptionsValue)
      ? (passiveBuffDescriptionsValue as string[][])
      : [];
    return {
      slot: index + 1,
      id,
      name: tGame(`battleImagines.${id}.name`, { defaultValue: String(id) }),
      rank,
      passiveEffects: (data?.passiveEffects ?? []).map(([attrId, ...rankValues]) => ({
        attrId,
        name: tgAttr(String(attrId)),
        value: rankValues[rank] ?? null,
      })),
      buffPassiveEffects: data?.bufPassiveEffects ?? [],
      passiveBuffDescriptions: passiveBuffDescriptions.flatMap((rankTexts) => {
        const description = Array.isArray(rankTexts) ? (rankTexts[rank] ?? rankTexts[0]) : '';
        return description ? [stripGameMarkup(description)] : [];
      }),
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
    schema: 'bpsr-build-planner-ai-export',
    schemaVersion: 2,
    profile: 'debug' as const,
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
        strength: bundle.stats.strength,
        agility: bundle.stats.agility,
        intellect: bundle.stats.intellect,
        endurance: bundle.stats.endurance,
        physicalDefense: bundle.stats.physicalDef,
        magicalDefense: bundle.stats.magicalDef,
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
      secondary: {
        resist: {
          raw: bundle.rawStats.resist,
          percent: roundForExport(bundle.stats.resist),
        },
      },
      derived: {
        attackSpeedPercent: roundForExport(bundle.derivedStats.atkSpeedPercent),
        castSpeedPercent: roundForExport(bundle.derivedStats.castSpeedPercent),
        critDamageBonusPercent: roundForExport(bundle.derivedStats.critDamageBonusPercent),
        critRecoveryPercent: roundForExport(bundle.derivedStats.critRecoveryPercent),
        luckyHitDamageMultiplierPercent: roundForExport(
          bundle.derivedStats.luckyHitDamageMultiplierPercent,
        ),
        luckyHitRecoveryMultiplierPercent: roundForExport(
          bundle.derivedStats.luckyHitRecoveryMultiplierPercent,
        ),
        physicalBoostPercent: roundForExport(bundle.derivedStats.physicalBoostPercent),
        magicalBoostPercent: roundForExport(bundle.derivedStats.magicalBoostPercent),
        physicalReductionPercent: roundForExport(bundle.derivedStats.physicalReductionPercent),
        magicalReductionPercent: roundForExport(bundle.derivedStats.magicalReductionPercent),
        physicalDefIgnorePercent: roundForExport(bundle.derivedStats.physicalDefIgnorePercent),
        versatilityDamageBonusPercent: roundForExport(
          bundle.derivedStats.versatilityDamageBonusPercent,
        ),
        versatilityDamageReductionPercent: roundForExport(
          bundle.derivedStats.versatilityDamageReductionPercent,
        ),
        staminaRegenPerSecond: roundForExport(bundle.derivedStats.staminaRegenPerSecond),
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
        equippedLevel: lifeWaveLevel,
        enabled: state.cookingBuff.lifeWaveEnabled,
        active: state.cookingBuff.lifeWaveEnabled && lifeWaveLevel > 0,
        targetIfActivated: bundle.lifeWaveCandidateTarget,
        appliedTarget: bundle.lifeWaveTarget,
      },
    },
    modules,
    activeModuleEffects,
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

  return result;
}

type AiExportSnapshot = ReturnType<typeof buildAiExportSnapshot>;

function buildCompactExport(snapshot: AiExportSnapshot) {
  return {
    schema: snapshot.schema,
    schemaVersion: snapshot.schemaVersion,
    profile: 'compact' as const,
    plannerVersion: snapshot.plannerVersion,
    shareUrl: snapshot.shareUrl,
    profession: snapshot.profession,
    stats: {
      main: snapshot.stats.main,
      five: snapshot.stats.five,
      secondary: snapshot.stats.secondary,
      derived: snapshot.stats.derived,
    },
    conditional: {
      highestFiveStatByRawValue: snapshot.conditional.highestFiveStatByRawValue,
      highestFiveStatByFinalPercent: snapshot.conditional.highestFiveStatByFinalPercent,
      plannerSelectedHighestRawTarget: snapshot.conditional.plannerSelectedHighestRawTarget,
      lifeWave: snapshot.conditional.lifeWave,
    },
    equipment: snapshot.equipment.map((item) => {
      if ('empty' in item) return item;
      return {
        slot: item.slot,
        name: item.name,
        equipmentScore: item.equipmentScore,
        refineLevel: item.refineLevel,
        completionPercent: item.completionPercent,
        evolution: item.effectiveEvolution,
        reforge: item.effectiveReforge,
        legendaryAffix: item.legendaryAffix
          ? { name: item.legendaryAffix.name, value: item.legendaryAffix.value }
          : null,
        legendaryAffixGroups: item.legendaryAffixGroups.flatMap((affix) =>
          affix ? [{ name: affix.name, value: affix.value }] : [],
        ),
        enchant: item.enchant
          ? {
              name: item.enchant.name,
              grade: item.enchant.grade,
              effects: item.enchant.effects.map(({ name, value }) => ({ name, value })),
            }
          : null,
      };
    }),
    moduleSlots: snapshot.modules.map((module) => {
      if ('empty' in module) return module;
      return {
        slot: module.slot,
        type: module.typeKey,
        quality: module.quality,
        effects: module.holes.flatMap((hole) =>
          hole.effectId == null
            ? []
            : [
                {
                  name: hole.effectName,
                  linkCount: hole.linkCount,
                },
              ],
        ),
      };
    }),
    activeModuleEffects: snapshot.activeModuleEffects.map((effect) => ({
      name: effect.effectName,
      totalLinkCount: effect.totalLinkCount,
      activeLevel: effect.activeLevel,
      effects: effect.activeEffects,
    })),
    battleImagines: snapshot.battleImagines.map((imagine) => {
      if ('empty' in imagine) return imagine;
      return {
        slot: imagine.slot,
        name: imagine.name,
        rank: imagine.rank,
        effects: [
          ...imagine.passiveEffects.map(({ name, value }) => ({
            kind: 'stat' as const,
            name,
            value,
          })),
          ...imagine.passiveBuffDescriptions.map((description) => ({
            kind: 'buffPassive' as const,
            description,
          })),
        ],
      };
    }),
    phantomProjection: {
      enabled: snapshot.phantomProjection.enabled,
      level: snapshot.phantomProjection.level,
      templateName: snapshot.phantomProjection.templateName,
      bondPoints: snapshot.phantomProjection.bondPoints,
      factors: snapshot.phantomProjection.factors.map((factor) => ({
        name: factor.name,
        grade: factor.grade,
        effect: factor.effect,
      })),
    },
  };
}

export function buildAiConsultationText(
  state: BuildStore,
  options: AiConsultationExportOptions,
  profile: AiExportProfile = 'compact',
): string {
  const snapshot = buildAiExportSnapshot(state, options);
  const result = profile === 'debug' ? snapshot : buildCompactExport(snapshot);
  return `BPSR Build Planner AI Export\n${JSON.stringify(result, null, 2)}`;
}
