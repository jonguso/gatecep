import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  router
} from "expo-router";

import {
  approveCorporateAction,
  deleteCorporateAction,
  getCorporateActionSummary,
  loadCorporateActions,
  rejectCorporateAction,
  saveCorporateAction,
  submitCorporateActionForReview
} from "../src/features/corporate-actions/corporateActionStore";

import {
  CORPORATE_ACTION_STATUSES,
  CORPORATE_ACTION_TYPES
} from "../src/features/corporate-actions/corporateActionTypes";

import {
  buildCorporateActionImpact
} from "../src/features/corporate-actions/corporateActionImpactService";

import {
  executeCorporateAction
} from "../src/features/corporate-actions/corporateActionExecutionService";

import {
  loadInvestorContext
} from "../src/features/investor/investorContextStore";

const EMPTY_FORM = {
  symbol: "",
  companyName: "",
  sector: "",

  actionType:
    CORPORATE_ACTION_TYPES.BONUS_SHARE,

  ratioNumerator:
    "1",

  ratioDenominator:
    "10",

  fractionalShareTreatment:
    "ROUND_DOWN",

  announcementDate:
    "",

  exDate:
    "",

  recordDate:
    "",

  effectiveDate:
    "",

  source:
    "MANUAL_ENTRY",

  notes:
    ""
};

const FILTERS = [
  "ALL",

  CORPORATE_ACTION_STATUSES.DRAFT,

  CORPORATE_ACTION_STATUSES.ANNOUNCED,

  CORPORATE_ACTION_STATUSES.UNDER_REVIEW,

  CORPORATE_ACTION_STATUSES.APPROVED,

  CORPORATE_ACTION_STATUSES.REJECTED,

  CORPORATE_ACTION_STATUSES.EXECUTED,

  CORPORATE_ACTION_STATUSES.CANCELLED,

  CORPORATE_ACTION_STATUSES.FAILED
];

export default function CorporateActionsCenter() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    processingId,
    setProcessingId
  ] = useState(null);

  const [
    actions,
    setActions
  ] = useState([]);

  const [
    summary,
    setSummary
  ] = useState({});

  const [
    holdings,
    setHoldings
  ] = useState([]);

  const [
    impacts,
    setImpacts
  ] = useState({});

  const [
    filter,
    setFilter
  ] = useState("ALL");

  const [
    modalVisible,
    setModalVisible
  ] = useState(false);

  const [
    editingId,
    setEditingId
  ] = useState(null);

  const [
    form,
    setForm
  ] = useState(
    EMPTY_FORM
  );

  const [
    preview,
    setPreview
  ] = useState(null);

  const [
    previewing,
    setPreviewing
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const loadData =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError("");

          const [
            savedActions,
            actionSummary,
            investorContext
          ] = await Promise.all([
            loadCorporateActions(),

            getCorporateActionSummary(),

            loadInvestorContext()
          ]);

          const safeActions =
            Array.isArray(
              savedActions
            )
              ? savedActions
              : [];

          const sortedActions =
            [...safeActions].sort(
              (a, b) =>
                new Date(
                  b?.updatedAt ||
                  b?.createdAt ||
                  0
                ).getTime() -
                new Date(
                  a?.updatedAt ||
                  a?.createdAt ||
                  0
                ).getTime()
            );

          setActions(
            sortedActions
          );

          setSummary(
            actionSummary ||
            {}
          );

          const portfolioHoldings =
            investorContext
              ?.practicePortfolio
              ?.holdings;

          setHoldings(
            Array.isArray(
              portfolioHoldings
            )
              ? portfolioHoldings
              : []
          );

          const impactEntries =
            await Promise.all(
              safeActions.map(
                async (
                  action
                ) => {
                  try {
                    const result =
                      await buildCorporateActionImpact({
                        corporateAction:
                          action
                      });

                    return [
                      action.id,
                      result
                    ];
                  } catch (
                    impactError
                  ) {
                    return [
                      action.id,
                      {
                        supported:
                          false,

                        executable:
                          false,

                        message:
                          impactError?.message ||
                          "Unable to calculate impact."
                      }
                    ];
                  }
                }
              )
            );

          setImpacts(
            Object.fromEntries(
              impactEntries
            )
          );
        } catch (
          loadError
        ) {
          console.error(
            "Unable to load Corporate Actions Center:",
            loadError
          );

          setError(
            loadError?.message ||
            "Unable to load corporate actions."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(
    () => {
      loadData();
    },
    [
      loadData
    ]
  );

  const visibleActions =
    useMemo(
      () => {
        if (
          filter ===
          "ALL"
        ) {
          return actions;
        }

        return actions.filter(
          (item) =>
            item?.status ===
            filter
        );
      },
      [
        actions,
        filter
      ]
    );

  function openCreate() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM
    });

    setPreview(null);

    setModalVisible(true);
  }

  function openEdit(
    action
  ) {
    if (
      action?.status ===
        CORPORATE_ACTION_STATUSES.EXECUTED
    ) {
      showMessage(
        "Corporate Actions",
        "An executed corporate action cannot be edited."
      );

      return;
    }

    setEditingId(
      action?.id ||
      null
    );

    setForm({
      symbol:
        action?.symbol ||
        "",

      companyName:
        action?.companyName ||
        "",

      sector:
        action?.sector ||
        "",

      actionType:
        action?.actionType ||
        CORPORATE_ACTION_TYPES
          .BONUS_SHARE,

      ratioNumerator:
        String(
          action
            ?.ratioNumerator ??
          1
        ),

      ratioDenominator:
        String(
          action
            ?.ratioDenominator ??
          10
        ),

      fractionalShareTreatment:
        action
          ?.fractionalShareTreatment ||
        "ROUND_DOWN",

      announcementDate:
        dateInputValue(
          action?.announcementDate
        ),

      exDate:
        dateInputValue(
          action?.exDate
        ),

      recordDate:
        dateInputValue(
          action?.recordDate
        ),

      effectiveDate:
        dateInputValue(
          action?.effectiveDate
        ),

      source:
        action?.source ||
        "MANUAL_ENTRY",

      notes:
        action?.notes ||
        ""
    });

    setPreview(
      impacts[
        action.id
      ] ||
      null
    );

    setModalVisible(true);
  }

  function selectHolding(
    holding
  ) {
    setForm(
      (current) => ({
        ...current,

        symbol:
          String(
            holding
              ?.symbol ||
            ""
          )
            .trim()
            .toUpperCase(),

        companyName:
          holding?.name ||
          holding?.symbol ||
          "",

        sector:
          holding?.sector ||
          ""
      })
    );

    setPreview(null);
  }

  function updateForm(
    field,
    value
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]:
          value
      })
    );

    setPreview(null);
  }

  function buildDraftAction() {
    const existingAction =
      editingId
        ? actions.find(
            (item) =>
              item?.id ===
              editingId
          )
        : null;

    return {
      id:
        editingId ||
        "UNSAVED_PREVIEW",

      actionType:
        form.actionType,

      status:
        existingAction
          ?.status ||
        CORPORATE_ACTION_STATUSES
          .DRAFT,

      symbol:
        String(
          form.symbol ||
          ""
        )
          .trim()
          .toUpperCase(),

      companyName:
        form.companyName ||
        null,

      sector:
        form.sector ||
        null,

      ratioNumerator:
        Number(
          form.ratioNumerator ||
          0
        ),

      ratioDenominator:
        Number(
          form.ratioDenominator ||
          0
        ),

      fractionalShareTreatment:
        String(
          form
            .fractionalShareTreatment ||
          "ROUND_DOWN"
        )
          .trim()
          .toUpperCase(),

      announcementDate:
        toIsoDate(
          form.announcementDate
        ),

      exDate:
        toIsoDate(
          form.exDate
        ),

      recordDate:
        toIsoDate(
          form.recordDate
        ),

      effectiveDate:
        toIsoDate(
          form.effectiveDate
        ),

      source:
        form.source ||
        "MANUAL_ENTRY",

      notes:
        form.notes ||
        null
    };
  }

  function validateDraft(
    draft
  ) {
    if (
      !draft.symbol
    ) {
      throw new Error(
        "Select or enter a security symbol."
      );
    }

    if (
      !draft.actionType
    ) {
      throw new Error(
        "Select a corporate action type."
      );
    }

    if (
      draft.ratioNumerator <=
        0 ||
      draft.ratioDenominator <=
        0
    ) {
      throw new Error(
        "The action ratio must contain positive values."
      );
    }

    const supportedTypes = [
      CORPORATE_ACTION_TYPES
        .BONUS_SHARE,

      CORPORATE_ACTION_TYPES
        .STOCK_SPLIT,

      CORPORATE_ACTION_TYPES
        .REVERSE_SPLIT
    ];

    if (
      !supportedTypes.includes(
        draft.actionType
      )
    ) {
      throw new Error(
        "This corporate action type is not currently supported."
      );
    }

    const allowedFractionalTreatments = [
      "ROUND_DOWN",
      "ROUND_UP",
      "ROUND_NEAREST",
      "ALLOW_FRACTIONAL"
    ];

    if (
      !allowedFractionalTreatments.includes(
        draft
          .fractionalShareTreatment
      )
    ) {
      throw new Error(
        "Fractional treatment must be ROUND_DOWN, ROUND_UP, ROUND_NEAREST, or ALLOW_FRACTIONAL."
      );
    }

    const dateFields = [
      {
        label:
          "Announcement date",

        value:
          form.announcementDate
      },
      {
        label:
          "Ex-date",

        value:
          form.exDate
      },
      {
        label:
          "Record date",

        value:
          form.recordDate
      },
      {
        label:
          "Effective date",

        value:
          form.effectiveDate
      }
    ];

    const invalidDate =
      dateFields.find(
        (item) =>
          item.value &&
          !isValidDateInput(
            item.value
          )
      );

    if (
      invalidDate
    ) {
      throw new Error(
        `${invalidDate.label} must use YYYY-MM-DD format.`
      );
    }
  }

  async function handlePreview() {
    try {
      setPreviewing(true);

      const draft =
        buildDraftAction();

      validateDraft(
        draft
      );

      const result =
        await buildCorporateActionImpact({
          corporateAction:
            draft
        });

      setPreview(
        result
      );
    } catch (
      previewError
    ) {
      showMessage(
        "Corporate Action Preview",
        previewError?.message ||
        "Unable to calculate the corporate action impact."
      );
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSave() {
    try {
      const draft =
        buildDraftAction();

      validateDraft(
        draft
      );

      setSaving(true);

      await saveCorporateAction({
        ...draft,

        id:
          editingId ||
          undefined,

        status:
          editingId
            ? draft.status
            : CORPORATE_ACTION_STATUSES
                .DRAFT
      });

      setModalVisible(false);

      setPreview(null);

      await loadData();

      showMessage(
        "Corporate Actions",
        editingId
          ? "Corporate action updated."
          : "Corporate action created."
      );
    } catch (
      saveError
    ) {
      console.error(
        "Unable to save corporate action:",
        saveError
      );

      showMessage(
        "Corporate Actions",
        saveError?.message ||
        "Unable to save the corporate action."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleOperation({
    action,
    operation
  }) {
    if (
      !action?.id
    ) {
      return;
    }

    try {
      setProcessingId(
        action.id
      );

      setError("");

      switch (
        operation
      ) {
        case "SUBMIT":
          await submitCorporateActionForReview(
            action.id
          );

          showMessage(
            "Corporate Actions",
            `${action.symbol} was submitted for review.`
          );

          break;

        case "APPROVE":
          await approveCorporateAction(
            action.id,
            "CURRENT_USER"
          );

          showMessage(
            "Corporate Actions",
            `${action.symbol} was approved and is ready for execution.`
          );

          break;

        case "REJECT":
          await rejectCorporateAction(
            action.id,
            {
              rejectedBy:
                "CURRENT_USER",

              reason:
                "Rejected through the PC-018 Corporate Actions Center."
            }
          );

          showMessage(
            "Corporate Actions",
            `${action.symbol} corporate action was rejected.`
          );

          break;

        case "EXECUTE": {
          const result =
            await executeCorporateAction({
              actionId:
                action.id,

              executedBy:
                "CURRENT_USER"
            });

          const execution =
            result?.execution ||
            {};

          if (
            result?.status ===
            "EXECUTED"
          ) {
            showMessage(
              "Corporate Action Executed",
              `${action.symbol} ${formatLabel(
                action.actionType
              )} executed successfully.\n\n` +
                `Quantity before: ${execution.quantityBefore}\n` +
                `Quantity change: ${signedNumber(
                  execution.quantityChange
                )}\n` +
                `Quantity after: ${execution.quantityAfter}\n` +
                `Average cost after: KES ${money(
                  execution.averagePriceAfter
                )}\n` +
                `Cash impact: KES ${money(
                  execution.cashImpact
                )}\n\n` +
                `Reference: ${
                  execution.executionReference ||
                  "Unavailable"
                }`
            );
          } else {
            showMessage(
              "Corporate Action",
              `This action was already executed.\n\nReference: ${
                result
                  ?.action
                  ?.executionReference ||
                result
                  ?.portfolioEvent
                  ?.reference ||
                "Unavailable"
              }`
            );
          }

          break;
        }

        case "DELETE":
          await deleteCorporateAction(
            action.id
          );

          showMessage(
            "Corporate Actions",
            "Corporate action deleted."
          );

          break;

        default:
          return;
      }

      await loadData();
    } catch (
      operationError
    ) {
      console.error(
        "Unable to update corporate action:",
        operationError
      );

      showMessage(
        "Corporate Actions",
        operationError?.message ||
        "Unable to update this corporate action."
      );

      await loadData();
    } finally {
      setProcessingId(null);
    }
  }

  function confirmDelete(
    action
  ) {
    if (
      action?.status ===
      CORPORATE_ACTION_STATUSES
        .EXECUTED
    ) {
      showMessage(
        "Delete Corporate Action",
        "An executed corporate action cannot be deleted."
      );

      return;
    }

    const message =
      `Delete the ${
        action?.symbol ||
        ""
      } ${
        formatLabel(
          action?.actionType
        )
      } corporate action?`;

    if (
      Platform.OS ===
      "web"
    ) {
      if (
        window.confirm(
          message
        )
      ) {
        handleOperation({
          action,

          operation:
            "DELETE"
        });
      }

      return;
    }

    Alert.alert(
      "Delete Corporate Action",
      message,
      [
        {
          text:
            "Cancel",

          style:
            "cancel"
        },
        {
          text:
            "Delete",

          style:
            "destructive",

          onPress:
            () =>
              handleOperation({
                action,

                operation:
                  "DELETE"
              })
        }
      ]
    );
  }

  function confirmExecution(
    action
  ) {
    const impact =
      impacts[
        action.id
      ];

    const quantityBefore =
      impact
        ?.impact
        ?.quantityBefore ??
      action?.quantityBefore ??
      0;

    const quantityAfter =
      impact
        ?.impact
        ?.quantityAfter ??
      action?.quantityAfter ??
      0;

    const quantityChange =
      impact
        ?.impact
        ?.quantityChange ??
      action?.quantityChange ??
      0;

    const message =
      `Execute the ${formatLabel(
        action?.actionType
      )} for ${
        action?.symbol ||
        ""
      }?\n\n` +
      `Quantity before: ${quantityBefore}\n` +
      `Quantity change: ${signedNumber(
        quantityChange
      )}\n` +
      `Quantity after: ${quantityAfter}\n` +
      `Cash impact: KES ${money(
        impact
          ?.impact
          ?.cashImpact ||
        0
      )}\n\n` +
      "This will update the Practice Portfolio and create an immutable Portfolio Event Ledger entry.";

    if (
      Platform.OS ===
      "web"
    ) {
      if (
        window.confirm(
          message
        )
      ) {
        handleOperation({
          action,

          operation:
            "EXECUTE"
        });
      }

      return;
    }

    Alert.alert(
      "Execute Corporate Action",
      message,
      [
        {
          text:
            "Cancel",

          style:
            "cancel"
        },
        {
          text:
            "Execute",

          onPress:
            () =>
              handleOperation({
                action,

                operation:
                  "EXECUTE"
              })
        }
      ]
    );
  }

  if (
    loading
  ) {
    return (
      <View
        style={
          styles.centerScreen
        }
      >
        <ActivityIndicator
          size="large"
          color="#67e8f9"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading corporate actions...
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={
          styles.screen
        }
        contentContainerStyle={
          styles.content
        }
      >
        <Text
          style={
            styles.eyebrow
          }
        >
          PC-018
        </Text>

        <Text
          style={
            styles.title
          }
        >
          Corporate Actions Center
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Create, review, approve, and execute
          controlled non-trade portfolio events.
        </Text>

        {error ? (
          <View
            style={
              styles.errorCard
            }
          >
            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        ) : null}

        <View
          style={
            styles.coachCard
          }
        >
          <Text
            style={
              styles.coachLabel
            }
          >
            COACH G
          </Text>

          <Text
            style={
              styles.coachText
            }
          >
            Bonus shares and stock splits preserve
            the holding's total economic value while
            changing its quantity and per-share cost.
            Only approved actions can be executed.
          </Text>
        </View>

        <View
          style={
            styles.metricGrid
          }
        >
          <Metric
            label="Total"
            value={
              summary?.total ||
              0
            }
          />

          <Metric
            label="Draft"
            value={
              summary?.draft ||
              0
            }
          />

          <Metric
            label="Under Review"
            value={
              summary
                ?.underReview ||
              0
            }
          />

          <Metric
            label="Approved"
            value={
              summary?.approved ||
              0
            }
          />

          <Metric
            label="Executed"
            value={
              summary?.executed ||
              0
            }
          />

          <Metric
            label="Rejected"
            value={
              summary?.rejected ||
              0
            }
          />
        </View>

        <Pressable
          style={
            styles.primaryButton
          }
          onPress={
            openCreate
          }
        >
          <Text
            style={
              styles.primaryButtonText
            }
          >
            Add Corporate Action
          </Text>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterRow
          }
        >
          {FILTERS.map(
            (item) => (
              <Pressable
                key={
                  item
                }
                style={[
                  styles.filterButton,

                  filter ===
                    item &&
                    styles.filterButtonActive
                ]}
                onPress={() =>
                  setFilter(
                    item
                  )
                }
              >
                <Text
                  style={[
                    styles.filterText,

                    filter ===
                      item &&
                      styles.filterTextActive
                  ]}
                >
                  {formatLabel(
                    item
                  )}
                </Text>
              </Pressable>
            )
          )}
        </ScrollView>

        {visibleActions.length ? (
          visibleActions.map(
            (action) => (
              <CorporateActionCard
                key={
                  action.id
                }
                action={
                  action
                }
                impact={
                  impacts[
                    action.id
                  ]
                }
                processing={
                  processingId ===
                  action.id
                }
                onEdit={() =>
                  openEdit(
                    action
                  )
                }
                onSubmit={() =>
                  handleOperation({
                    action,

                    operation:
                      "SUBMIT"
                  })
                }
                onApprove={() =>
                  handleOperation({
                    action,

                    operation:
                      "APPROVE"
                  })
                }
                onReject={() =>
                  handleOperation({
                    action,

                    operation:
                      "REJECT"
                  })
                }
                onExecute={() =>
                  confirmExecution(
                    action
                  )
                }
                onDelete={() =>
                  confirmDelete(
                    action
                  )
                }
              />
            )
          )
        ) : (
          <EmptyState
            title="No Corporate Actions"
            message="Create the first bonus share, stock split, or reverse split action."
          />
        )}

        <View
          style={
            styles.protectionCard
          }
        >
          <Text
            style={
              styles.protectionTitle
            }
          >
            Controlled Execution
          </Text>

          <Text
            style={
              styles.protectionText
            }
          >
            Saving or approving an action does not
            change holdings. The Practice Portfolio
            changes only when an approved action is
            explicitly executed. Duplicate execution
            is prevented by a deterministic reference.
          </Text>
        </View>

        <Pressable
          style={
            styles.secondaryButton
          }
          onPress={
            loadData
          }
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Refresh Corporate Actions
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.secondaryButton
          }
          onPress={() =>
            router.replace(
              "/(tabs)/dashboard"
            )
          }
        >
          <Text
            style={
              styles.secondaryButtonText
            }
          >
            Back to Dashboard
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={
          modalVisible
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setModalVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <ScrollView
            style={
              styles.modal
            }
            contentContainerStyle={
              styles.modalContent
            }
          >
            <Text
              style={
                styles.modalEyebrow
              }
            >
              PC-018
            </Text>

            <Text
              style={
                styles.modalTitle
              }
            >
              {editingId
                ? "Edit Corporate Action"
                : "Add Corporate Action"}
            </Text>

            {holdings.length ? (
              <View
                style={
                  styles.holdingPicker
                }
              >
                <Text
                  style={
                    styles.inputLabel
                  }
                >
                  Select Current Holding
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.holdingPickerRow
                  }
                >
                  {holdings.map(
                    (
                      holding
                    ) => (
                      <Pressable
                        key={
                          holding.symbol
                        }
                        style={[
                          styles.holdingChip,

                          String(
                            form.symbol ||
                            ""
                          )
                            .trim()
                            .toUpperCase() ===
                            String(
                              holding.symbol ||
                              ""
                            )
                              .trim()
                              .toUpperCase() &&
                            styles.holdingChipActive
                        ]}
                        onPress={() =>
                          selectHolding(
                            holding
                          )
                        }
                      >
                        <Text
                          style={
                            styles.holdingChipText
                          }
                        >
                          {
                            holding.symbol
                          }
                        </Text>
                      </Pressable>
                    )
                  )}
                </ScrollView>
              </View>
            ) : null}

            <Text
              style={
                styles.inputLabel
              }
            >
              Action Type
            </Text>

            <View
              style={
                styles.typeGrid
              }
            >
              {[
                CORPORATE_ACTION_TYPES
                  .BONUS_SHARE,

                CORPORATE_ACTION_TYPES
                  .STOCK_SPLIT,

                CORPORATE_ACTION_TYPES
                  .REVERSE_SPLIT
              ].map(
                (
                  type
                ) => (
                  <Pressable
                    key={
                      type
                    }
                    style={[
                      styles.typeButton,

                      form.actionType ===
                        type &&
                        styles.typeButtonActive
                    ]}
                    onPress={() =>
                      updateForm(
                        "actionType",
                        type
                      )
                    }
                  >
                    <Text
                      style={
                        styles.typeButtonText
                      }
                    >
                      {formatLabel(
                        type
                      )}
                    </Text>
                  </Pressable>
                )
              )}
            </View>

            <Field
              label="Symbol"
              value={
                form.symbol
              }
              onChangeText={(
                value
              ) =>
                updateForm(
                  "symbol",
                  value
                )
              }
            />

            <Field
              label="Company Name"
              value={
                form.companyName
              }
              onChangeText={(
                value
              ) =>
                updateForm(
                  "companyName",
                  value
                )
              }
            />

            <Field
              label="Sector"
              value={
                form.sector
              }
              onChangeText={(
                value
              ) =>
                updateForm(
                  "sector",
                  value
                )
              }
            />

            <Field
              label="Ratio Numerator"
              value={
                form
                  .ratioNumerator
              }
              keyboardType="decimal-pad"
              onChangeText={(
                value
              ) =>
                updateForm(
                  "ratioNumerator",
                  value
                )
              }
            />

            <Field
              label="Ratio Denominator"
              value={
                form
                  .ratioDenominator
              }
              keyboardType="decimal-pad"
              onChangeText={(
                value
              ) =>
                updateForm(
                  "ratioDenominator",
                  value
                )
              }
            />

            <Field
              label="Fractional Treatment"
              value={
                form
                  .fractionalShareTreatment
              }
              placeholder="ROUND_DOWN"
              onChangeText={(
                value
              ) =>
                updateForm(
                  "fractionalShareTreatment",
                  value
                    .trim()
                    .toUpperCase()
                )
              }
            />

            <Field
              label="Announcement Date"
              value={
                form
                  .announcementDate
              }
              placeholder="YYYY-MM-DD"
              onChangeText={(
                value
              ) =>
                updateForm(
                  "announcementDate",
                  value
                )
              }
            />

            <Field
              label="Ex-Date"
              value={
                form.exDate
              }
              placeholder="YYYY-MM-DD"
              onChangeText={(
                value
              ) =>
                updateForm(
                  "exDate",
                  value
                )
              }
            />

            <Field
              label="Record Date"
              value={
                form.recordDate
              }
              placeholder="YYYY-MM-DD"
              onChangeText={(
                value
              ) =>
                updateForm(
                  "recordDate",
                  value
                )
              }
            />

            <Field
              label="Effective Date"
              value={
                form.effectiveDate
              }
              placeholder="YYYY-MM-DD"
              onChangeText={(
                value
              ) =>
                updateForm(
                  "effectiveDate",
                  value
                )
              }
            />

            <Field
              label="Source"
              value={
                form.source
              }
              onChangeText={(
                value
              ) =>
                updateForm(
                  "source",
                  value
                )
              }
            />

            <Field
              label="Notes"
              value={
                form.notes
              }
              multiline
              onChangeText={(
                value
              ) =>
                updateForm(
                  "notes",
                  value
                )
              }
            />

            <Pressable
              disabled={
                previewing
              }
              style={[
                styles.previewButton,

                previewing &&
                  styles.buttonDisabled
              ]}
              onPress={
                handlePreview
              }
            >
              {previewing ? (
                <ActivityIndicator
                  color="white"
                />
              ) : (
                <Text
                  style={
                    styles.previewButtonText
                  }
                >
                  Preview Impact
                </Text>
              )}
            </Pressable>

            {preview ? (
              <ImpactPreview
                impact={
                  preview
                }
              />
            ) : null}

            <Pressable
              disabled={
                saving
              }
              style={[
                styles.modalPrimaryButton,

                saving &&
                  styles.buttonDisabled
              ]}
              onPress={
                handleSave
              }
            >
              {saving ? (
                <ActivityIndicator
                  color="white"
                />
              ) : (
                <Text
                  style={
                    styles.modalPrimaryButtonText
                  }
                >
                  Save Corporate Action
                </Text>
              )}
            </Pressable>

            <Pressable
              style={
                styles.modalSecondaryButton
              }
              onPress={() =>
                setModalVisible(
                  false
                )
              }
            >
              <Text
                style={
                  styles.modalSecondaryButtonText
                }
              >
                Cancel
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function CorporateActionCard({
  action,
  impact,
  processing,
  onEdit,
  onSubmit,
  onApprove,
  onReject,
  onExecute,
  onDelete
}) {
  const status =
    action?.status ||
    CORPORATE_ACTION_STATUSES
      .DRAFT;

  const isExecuted =
    status ===
    CORPORATE_ACTION_STATUSES
      .EXECUTED;

  const isCancelled =
    status ===
    CORPORATE_ACTION_STATUSES
      .CANCELLED;

  const isRejected =
    status ===
    CORPORATE_ACTION_STATUSES
      .REJECTED;

  const isFailed =
    status ===
    CORPORATE_ACTION_STATUSES
      .FAILED;

  const terminal =
    isExecuted ||
    isCancelled;

  return (
    <View
      style={[
        styles.actionCard,

        isExecuted &&
          styles.executedActionCard
      ]}
    >
      <View
        style={
          styles.cardHeader
        }
      >
        <View
          style={{
            flex: 1
          }}
        >
          <Text
            style={
              styles.symbol
            }
          >
            {action.symbol}
          </Text>

          <Text
            style={
              styles.companyName
            }
          >
            {action.companyName ||
              action.symbol}
          </Text>

          <Text
            style={
              styles.actionType
            }
          >
            {formatLabel(
              action.actionType
            )}
          </Text>
        </View>

        <Text
          style={[
            styles.status,

            isExecuted &&
              styles.statusExecuted,

            isRejected &&
              styles.statusRejected,

            isFailed &&
              styles.statusFailed
          ]}
        >
          {formatLabel(
            status
          )}
        </Text>
      </View>

      <View
        style={
          styles.detailCard
        }
      >
        <Row
          label="Ratio"
          value={`${action.ratioNumerator}:${action.ratioDenominator}`}
        />

        <Row
          label="Fractional Treatment"
          value={
            formatLabel(
              action
                .fractionalShareTreatment
            )
          }
        />

        <Row
          label="Record Date"
          value={
            formatDate(
              action.recordDate
            )
          }
        />

        <Row
          label="Effective Date"
          value={
            formatDate(
              action.effectiveDate
            )
          }
        />
      </View>

      {impact ? (
        <ImpactPreview
          impact={
            impact
          }
          compact
        />
      ) : null}

      {isExecuted ? (
        <View
          style={
            styles.executedCard
          }
        >
          <Text
            style={
              styles.executedTitle
            }
          >
            Execution Complete
          </Text>

          <Row
            label="Quantity Before"
            value={
              action
                ?.quantityBefore ||
              0
            }
          />

          <Row
            label="Quantity Change"
            value={
              signedNumber(
                action
                  ?.quantityChange
              )
            }
            highlight
          />

          <Row
            label="Quantity After"
            value={
              action
                ?.quantityAfter ||
              0
            }
            highlight
          />

          <Row
            label="Cash Impact"
            value={`KES ${money(
              action?.cashImpact
            )}`}
          />

          <Row
            label="Executed At"
            value={
              formatDateTime(
                action?.executedAt
              )
            }
          />

          <Row
            label="Reference"
            value={
              action
                ?.executionReference ||
              "Unavailable"
            }
          />
        </View>
      ) : null}

      {isRejected &&
      action?.rejectionReason ? (
        <View
          style={
            styles.rejectedCard
          }
        >
          <Text
            style={
              styles.rejectedTitle
            }
          >
            Rejection Reason
          </Text>

          <Text
            style={
              styles.rejectedText
            }
          >
            {
              action.rejectionReason
            }
          </Text>
        </View>
      ) : null}

      {isFailed &&
      action?.failureReason ? (
        <View
          style={
            styles.failedCard
          }
        >
          <Text
            style={
              styles.failedTitle
            }
          >
            Execution Failed
          </Text>

          <Text
            style={
              styles.failedText
            }
          >
            {
              action.failureReason
            }
          </Text>
        </View>
      ) : null}

      {!terminal ? (
        <View
          style={
            styles.actionButtonGroup
          }
        >
          {status ===
          CORPORATE_ACTION_STATUSES
            .DRAFT ? (
            <>
              <ActionButton
                label="Edit"
                onPress={
                  onEdit
                }
                disabled={
                  processing
                }
              />

              <ActionButton
                label="Submit for Review"
                onPress={
                  onSubmit
                }
                primary
                disabled={
                  processing
                }
              />
            </>
          ) : null}

          {status ===
          CORPORATE_ACTION_STATUSES
            .UNDER_REVIEW ? (
            <>
              <ActionButton
                label="Approve"
                onPress={
                  onApprove
                }
                primary
                disabled={
                  processing
                }
              />

              <ActionButton
                label="Reject"
                onPress={
                  onReject
                }
                danger
                disabled={
                  processing
                }
              />
            </>
          ) : null}

          {status ===
          CORPORATE_ACTION_STATUSES
            .APPROVED ? (
            <>
              <View
                style={
                  styles.approvedNotice
                }
              >
                <Text
                  style={
                    styles.approvedNoticeText
                  }
                >
                  Approved and ready for execution.
                </Text>
              </View>

              <ActionButton
                label="Execute Corporate Action"
                onPress={
                  onExecute
                }
                primary
                disabled={
                  processing
                }
              />
            </>
          ) : null}

          {status ===
            CORPORATE_ACTION_STATUSES
              .REJECTED ||
          status ===
            CORPORATE_ACTION_STATUSES
              .FAILED ? (
            <ActionButton
              label="Edit"
              onPress={
                onEdit
              }
              disabled={
                processing
              }
            />
          ) : null}

          <ActionButton
            label="Delete"
            onPress={
              onDelete
            }
            danger
            disabled={
              processing
            }
          />
        </View>
      ) : null}

      {processing ? (
        <ActivityIndicator
          color="#67e8f9"
          style={{
            marginTop: 14
          }}
        />
      ) : null}
    </View>
  );
}

function ImpactPreview({
  impact,
  compact = false
}) {
  if (
    !impact?.impact
  ) {
    return (
      <View
        style={
          styles.previewError
        }
      >
        <Text
          style={
            styles.previewErrorText
          }
        >
          {impact?.message ||
            "Impact preview unavailable."}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.impactCard,

        compact &&
          styles.compactImpactCard
      ]}
    >
      <Text
        style={
          styles.impactTitle
        }
      >
        Impact Preview
      </Text>

      <Row
        label="Quantity Before"
        value={
          impact
            .impact
            .quantityBefore
        }
      />

      <Row
        label="Raw Quantity After"
        value={
          impact
            .impact
            .rawQuantityAfter
        }
      />

      <Row
        label="Final Quantity"
        value={
          impact
            .impact
            .quantityAfter
        }
        highlight
      />

      <Row
        label="Quantity Change"
        value={
          signedNumber(
            impact
              .impact
              .quantityChange
          )
        }
        highlight
      />

      <Row
        label="Fractional Quantity"
        value={
          impact
            .impact
            .fractionalQuantity
        }
      />

      <Row
        label="Average Cost Before"
        value={`KES ${money(
          impact
            .impact
            .averagePriceBefore
        )}`}
      />

      <Row
        label="Average Cost After"
        value={`KES ${money(
          impact
            .impact
            .averagePriceAfter
        )}`}
      />

      <Row
        label="Market Price Before"
        value={`KES ${money(
          impact
            .impact
            .marketPriceBefore
        )}`}
      />

      <Row
        label="Theoretical Price After"
        value={`KES ${money(
          impact
            .impact
            .theoreticalMarketPriceAfter
        )}`}
      />

      <Row
        label="Cost Value Before"
        value={`KES ${money(
          impact
            .impact
            .costValueBefore
        )}`}
      />

      <Row
        label="Cost Value After"
        value={`KES ${money(
          impact
            .impact
            .costValueAfter
        )}`}
      />

      <Row
        label="Cash Impact"
        value={`KES ${money(
          impact
            .impact
            .cashImpact
        )}`}
      />

      {impact?.explanation ? (
        <Text
          style={
            styles.impactExplanation
          }
        >
          {impact.explanation}
        </Text>
      ) : null}

      {impact
        ?.warnings
        ?.length ? (
        <View
          style={
            styles.warningCard
          }
        >
          {impact.warnings.map(
            (
              warning,
              index
            ) => (
              <Text
                key={`${warning}-${index}`}
                style={
                  styles.warningText
                }
              >
                • {warning}
              </Text>
            )
          )}
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  primary = false,
  danger = false,
  disabled = false
}) {
  return (
    <Pressable
      disabled={
        disabled
      }
      style={[
        styles.actionButton,

        primary &&
          styles.actionButtonPrimary,

        danger &&
          styles.actionButtonDanger,

        disabled &&
          styles.buttonDisabled
      ]}
      onPress={
        onPress
      }
    >
      <Text
        style={[
          styles.actionButtonText,

          primary &&
            styles.actionButtonTextPrimary,

          danger &&
            styles.actionButtonTextDanger
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false
}) {
  return (
    <View
      style={
        styles.field
      }
    >
      <Text
        style={
          styles.inputLabel
        }
      >
        {label}
      </Text>

      <TextInput
        style={[
          styles.input,

          multiline &&
            styles.multilineInput
        ]}
        value={
          String(
            value ??
            ""
          )
        }
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder ||
          label
        }
        placeholderTextColor="#64748b"
        keyboardType={
          keyboardType ||
          "default"
        }
        multiline={
          multiline
        }
      />
    </View>
  );
}

function Metric({
  label,
  value
}) {
  return (
    <View
      style={
        styles.metric
      }
    >
      <Text
        style={
          styles.metricLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.metricValue
        }
      >
        {String(
          value
        )}
      </Text>
    </View>
  );
}

function Row({
  label,
  value,
  highlight = false
}) {
  return (
    <View
      style={
        styles.row
      }
    >
      <Text
        style={
          styles.rowLabel
        }
      >
        {label}
      </Text>

      <Text
        style={[
          styles.rowValue,

          highlight &&
            styles.rowHighlight
        ]}
      >
        {String(
          value ??
          "N/A"
        )}
      </Text>
    </View>
  );
}

function EmptyState({
  title,
  message
}) {
  return (
    <View
      style={
        styles.emptyCard
      }
    >
      <Text
        style={
          styles.emptyTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        {message}
      </Text>
    </View>
  );
}

function dateInputValue(
  value
) {
  if (
    !value
  ) {
    return "";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}

function toIsoDate(
  value
) {
  if (
    !value
  ) {
    return null;
  }

  const date =
    new Date(
      `${value}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date
    .toISOString();
}

function isValidDateInput(
  value
) {
  const text =
    String(
      value ||
      ""
    );

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      text
    )
  ) {
    return false;
  }

  const date =
    new Date(
      `${text}T12:00:00`
    );

  return !Number.isNaN(
    date.getTime()
  );
}

function formatDate(
  value
) {
  if (
    !value
  ) {
    return "Not provided";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric"
    }
  );
}

function formatDateTime(
  value
) {
  if (
    !value
  ) {
    return "Not provided";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown";
  }

  return date.toLocaleString(
    "en-US"
  );
}

function formatLabel(
  value
) {
  return String(
    value ||
    ""
  )
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
}

function signedNumber(
  value
) {
  const parsed =
    Number(
      value ||
      0
    );

  if (
    parsed > 0
  ) {
    return `+${parsed}`;
  }

  return String(
    parsed
  );
}

function money(
  value
) {
  return Number(
    value ||
    0
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2
    }
  );
}

function showMessage(
  title,
  message
) {
  if (
    Platform.OS ===
    "web"
  ) {
    window.alert(
      `${title}\n\n${message}`
    );

    return;
  }

  Alert.alert(
    title,
    message
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex:
        1,

      backgroundColor:
        "#020617"
    },

    content: {
      padding:
        22,

      paddingTop:
        70,

      paddingBottom:
        110
    },

    centerScreen: {
      flex:
        1,

      backgroundColor:
        "#020617",

      alignItems:
        "center",

      justifyContent:
        "center",

      padding:
        24
    },

    loadingText: {
      color:
        "#94a3b8",

      marginTop:
        14
    },

    eyebrow: {
      color:
        "#c084fc",

      fontWeight:
        "900"
    },

    title: {
      color:
        "white",

      fontSize:
        31,

      fontWeight:
        "900",

      marginTop:
        8
    },

    subtitle: {
      color:
        "#94a3b8",

      lineHeight:
        22,

      marginTop:
        10,

      marginBottom:
        20
    },

    coachCard: {
      backgroundColor:
        "rgba(147,51,234,.12)",

      borderColor:
        "rgba(147,51,234,.35)",

      borderWidth:
        1,

      borderRadius:
        20,

      padding:
        18
    },

    coachLabel: {
      color:
        "#c084fc",

      fontWeight:
        "900"
    },

    coachText: {
      color:
        "white",

      lineHeight:
        22,

      marginTop:
        8
    },

    metricGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        10,

      marginTop:
        18
    },

    metric: {
      width:
        "47%",

      backgroundColor:
        "#0f172a",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        17,

      padding:
        14
    },

    metricLabel: {
      color:
        "#94a3b8",

      fontSize:
        11
    },

    metricValue: {
      color:
        "white",

      fontWeight:
        "900",

      marginTop:
        6
    },

    primaryButton: {
      backgroundColor:
        "#9333ea",

      padding:
        17,

      borderRadius:
        17,

      marginTop:
        20
    },

    primaryButtonText: {
      color:
        "white",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    filterRow: {
      gap:
        8,

      paddingVertical:
        20
    },

    filterButton: {
      backgroundColor:
        "#1e293b",

      paddingHorizontal:
        13,

      paddingVertical:
        10,

      borderRadius:
        13
    },

    filterButtonActive: {
      backgroundColor:
        "#9333ea"
    },

    filterText: {
      color:
        "#94a3b8",

      fontWeight:
        "900"
    },

    filterTextActive: {
      color:
        "white"
    },

    actionCard: {
      backgroundColor:
        "#0f172a",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        20,

      padding:
        18,

      marginBottom:
        16
    },

    executedActionCard: {
      borderColor:
        "rgba(34,197,94,.45)"
    },

    cardHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        14
    },

    symbol: {
      color:
        "#67e8f9",

      fontSize:
        24,

      fontWeight:
        "900"
    },

    companyName: {
      color:
        "#cbd5e1",

      marginTop:
        3
    },

    actionType: {
      color:
        "#c084fc",

      fontWeight:
        "900",

      marginTop:
        7
    },

    status: {
      color:
        "#fde68a",

      fontSize:
        11,

      fontWeight:
        "900"
    },

    statusExecuted: {
      color:
        "#86efac"
    },

    statusRejected: {
      color:
        "#fca5a5"
    },

    statusFailed: {
      color:
        "#fca5a5"
    },

    detailCard: {
      backgroundColor:
        "#020617",

      borderRadius:
        14,

      padding:
        13,

      marginTop:
        15
    },

    impactCard: {
      backgroundColor:
        "rgba(34,197,94,.08)",

      borderColor:
        "rgba(34,197,94,.30)",

      borderWidth:
        1,

      borderRadius:
        15,

      padding:
        14,

      marginTop:
        15
    },

    compactImpactCard: {
      backgroundColor:
        "rgba(15,23,42,.75)"
    },

    impactTitle: {
      color:
        "#86efac",

      fontWeight:
        "900",

      marginBottom:
        3
    },

    impactExplanation: {
      color:
        "#cbd5e1",

      lineHeight:
        20,

      marginTop:
        12
    },

    warningCard: {
      backgroundColor:
        "rgba(245,158,11,.10)",

      borderRadius:
        12,

      padding:
        11,

      marginTop:
        12
    },

    warningText: {
      color:
        "#fde68a",

      lineHeight:
        19,

      marginTop:
        3
    },

    previewError: {
      backgroundColor:
        "rgba(239,68,68,.10)",

      borderRadius:
        13,

      padding:
        13,

      marginTop:
        15
    },

    previewErrorText: {
      color:
        "#fca5a5"
    },

    executedCard: {
      backgroundColor:
        "rgba(34,197,94,.10)",

      borderColor:
        "rgba(34,197,94,.35)",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        15
    },

    executedTitle: {
      color:
        "#86efac",

      fontWeight:
        "900",

      marginBottom:
        3
    },

    rejectedCard: {
      backgroundColor:
        "rgba(239,68,68,.08)",

      borderColor:
        "rgba(239,68,68,.30)",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        15
    },

    rejectedTitle: {
      color:
        "#fca5a5",

      fontWeight:
        "900"
    },

    rejectedText: {
      color:
        "#fecaca",

      marginTop:
        7,

      lineHeight:
        20
    },

    failedCard: {
      backgroundColor:
        "rgba(239,68,68,.08)",

      borderColor:
        "rgba(239,68,68,.30)",

      borderWidth:
        1,

      borderRadius:
        14,

      padding:
        14,

      marginTop:
        15
    },

    failedTitle: {
      color:
        "#fca5a5",

      fontWeight:
        "900"
    },

    failedText: {
      color:
        "#fecaca",

      marginTop:
        7,

      lineHeight:
        20
    },

    row: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      gap:
        14,

      marginTop:
        10
    },

    rowLabel: {
      color:
        "#94a3b8",

      flex:
        1
    },

    rowValue: {
      color:
        "white",

      fontWeight:
        "900",

      textAlign:
        "right",

      flex:
        1
    },

    rowHighlight: {
      color:
        "#86efac"
    },

    actionButtonGroup: {
      marginTop:
        14
    },

    actionButton: {
      backgroundColor:
        "#1e293b",

      borderColor:
        "#334155",

      borderWidth:
        1,

      borderRadius:
        13,

      padding:
        13,

      marginTop:
        9
    },

    actionButtonPrimary: {
      backgroundColor:
        "#9333ea",

      borderColor:
        "#9333ea"
    },

    actionButtonDanger: {
      backgroundColor:
        "rgba(239,68,68,.10)",

      borderColor:
        "rgba(239,68,68,.35)"
    },

    actionButtonText: {
      color:
        "#67e8f9",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    actionButtonTextPrimary: {
      color:
        "white"
    },

    actionButtonTextDanger: {
      color:
        "#fca5a5"
    },

    approvedNotice: {
      backgroundColor:
        "rgba(34,197,94,.10)",

      borderRadius:
        12,

      padding:
        12,

      marginTop:
        9
    },

    approvedNoticeText: {
      color:
        "#86efac",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    protectionCard: {
      backgroundColor:
        "rgba(245,158,11,.10)",

      borderColor:
        "rgba(245,158,11,.35)",

      borderWidth:
        1,

      borderRadius:
        18,

      padding:
        17,

      marginTop:
        18
    },

    protectionTitle: {
      color:
        "#fde68a",

      fontWeight:
        "900"
    },

    protectionText: {
      color:
        "#fef3c7",

      lineHeight:
        21,

      marginTop:
        7
    },

    secondaryButton: {
      backgroundColor:
        "#1e293b",

      padding:
        16,

      borderRadius:
        17,

      marginTop:
        12
    },

    secondaryButtonText: {
      color:
        "#67e8f9",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    emptyCard: {
      backgroundColor:
        "#0f172a",

      borderColor:
        "#1e293b",

      borderWidth:
        1,

      borderRadius:
        18,

      padding:
        17
    },

    emptyTitle: {
      color:
        "#67e8f9",

      fontWeight:
        "900"
    },

    emptyText: {
      color:
        "#94a3b8",

      lineHeight:
        20,

      marginTop:
        7
    },

    errorCard: {
      backgroundColor:
        "rgba(239,68,68,.10)",

      borderColor:
        "rgba(239,68,68,.35)",

      borderWidth:
        1,

      borderRadius:
        16,

      padding:
        14,

      marginBottom:
        15
    },

    errorText: {
      color:
        "#fca5a5"
    },

    modalOverlay: {
      flex:
        1,

      backgroundColor:
        "rgba(0,0,0,.78)",

      justifyContent:
        "center",

      padding:
        16
    },

    modal: {
      maxHeight:
        "94%",

      backgroundColor:
        "#020617",

      borderColor:
        "#334155",

      borderWidth:
        1,

      borderRadius:
        22
    },

    modalContent: {
      padding:
        18,

      paddingBottom:
        34
    },

    modalEyebrow: {
      color:
        "#c084fc",

      fontWeight:
        "900"
    },

    modalTitle: {
      color:
        "white",

      fontSize:
        26,

      fontWeight:
        "900",

      marginTop:
        7
    },

    holdingPicker: {
      marginTop:
        18
    },

    holdingPickerRow: {
      gap:
        8,

      paddingVertical:
        8
    },

    holdingChip: {
      backgroundColor:
        "#1e293b",

      borderRadius:
        13,

      paddingHorizontal:
        14,

      paddingVertical:
        10
    },

    holdingChipActive: {
      backgroundColor:
        "#9333ea"
    },

    holdingChipText: {
      color:
        "white",

      fontWeight:
        "900"
    },

    typeGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        8,

      marginTop:
        8
    },

    typeButton: {
      backgroundColor:
        "#1e293b",

      borderRadius:
        12,

      paddingHorizontal:
        12,

      paddingVertical:
        10
    },

    typeButtonActive: {
      backgroundColor:
        "#9333ea"
    },

    typeButtonText: {
      color:
        "white",

      fontWeight:
        "900"
    },

    field: {
      marginTop:
        14
    },

    inputLabel: {
      color:
        "#94a3b8",

      fontSize:
        12,

      marginTop:
        14
    },

    input: {
      marginTop:
        7,

      backgroundColor:
        "#0f172a",

      borderColor:
        "#334155",

      borderWidth:
        1,

      borderRadius:
        13,

      padding:
        14,

      color:
        "white"
    },

    multilineInput: {
      minHeight:
        90,

      textAlignVertical:
        "top"
    },

    previewButton: {
      backgroundColor:
        "#0f766e",

      padding:
        16,

      borderRadius:
        15,

      marginTop:
        20
    },

    previewButtonText: {
      color:
        "white",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    modalPrimaryButton: {
      backgroundColor:
        "#9333ea",

      padding:
        17,

      borderRadius:
        16,

      marginTop:
        18
    },

    modalPrimaryButtonText: {
      color:
        "white",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    modalSecondaryButton: {
      backgroundColor:
        "#1e293b",

      padding:
        15,

      borderRadius:
        16,

      marginTop:
        11
    },

    modalSecondaryButtonText: {
      color:
        "#67e8f9",

      textAlign:
        "center",

      fontWeight:
        "900"
    },

    buttonDisabled: {
      opacity:
        0.6
    }
  });