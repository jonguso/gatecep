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
  deleteDividendRecord,
  loadDividendRecords,
  saveDividendRecord
} from "../src/features/dividends/dividendStore";

import {
  buildDividendForecast
} from "../src/features/dividends/dividendForecastService";

import {
  receiveDividend
} from "../src/features/dividends/dividendReceiptService";

import {
  loadInvestorContext
} from "../src/features/investor/investorContextStore";

const CURRENT_YEAR =
  new Date().getFullYear();

const EMPTY_FORM = {
  symbol: "",
  companyName: "",
  sector: "",
  dividendType: "FINAL",
  dividendPerShare: "",
  withholdingTaxRate: "5",
  announcementDate: "",
  exDividendDate: "",
  recordDate: "",
  paymentDate: "",
  financialYear:
    String(CURRENT_YEAR),
  status: "ANNOUNCED",
  confidence: "CONFIRMED",
  source: "MANUAL_ENTRY",
  notes: ""
};

export default function DividendCenter() {
  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    receivingId,
    setReceivingId
  ] = useState(null);

  const [
    records,
    setRecords
  ] = useState([]);

  const [
    forecast,
    setForecast
  ] = useState(null);

  const [
    holdings,
    setHoldings
  ] = useState([]);

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
    selectedYear,
    setSelectedYear
  ] = useState(
    CURRENT_YEAR
  );

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
            savedRecords,
            forecastResult,
            investorContext
          ] = await Promise.all([
            loadDividendRecords(),

            buildDividendForecast({
              year:
                selectedYear
            }),

            loadInvestorContext()
          ]);

          setRecords(
            Array.isArray(
              savedRecords
            )
              ? savedRecords
              : []
          );

          setForecast(
            forecastResult ||
            null
          );

          setHoldings(
            Array.isArray(
              investorContext
                ?.practicePortfolio
                ?.holdings
            )
              ? investorContext
                  .practicePortfolio
                  .holdings
              : []
          );
        } catch (loadError) {
          console.error(
            "Unable to load Dividend Center:",
            loadError
          );

          setError(
            loadError?.message ||
              "Unable to load dividend information."
          );
        } finally {
          setLoading(false);
        }
      },
      [
        selectedYear
      ]
    );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const upcomingRecords =
    useMemo(() => {
      const now =
        new Date();

      return [...records]
        .filter(
          (record) => {
            if (
              record?.status ===
              "CANCELLED"
            ) {
              return false;
            }

            if (
              record?.status ===
              "PAID"
            ) {
              return false;
            }

            if (
              !record?.paymentDate
            ) {
              return false;
            }

            const paymentDate =
              new Date(
                record.paymentDate
              );

            return (
              !Number.isNaN(
                paymentDate.getTime()
              ) &&
              paymentDate >=
                now
            );
          }
        )
        .sort(
          (a, b) =>
            new Date(
              a.paymentDate
            ).getTime() -
            new Date(
              b.paymentDate
            ).getTime()
        );
    }, [records]);

  const summary =
    forecast?.summary ||
    {};

  function openCreate() {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,

      financialYear:
        String(
          selectedYear
        )
    });

    setModalVisible(true);
  }

  function openEdit(
    record
  ) {
    setEditingId(
      record?.id ||
      null
    );

    setForm({
      symbol:
        record?.symbol ||
        "",

      companyName:
        record?.companyName ||
        "",

      sector:
        record?.sector ||
        "",

      dividendType:
        record?.dividendType ||
        "FINAL",

      dividendPerShare:
        String(
          record
            ?.dividendPerShare ??
          ""
        ),

      withholdingTaxRate:
        String(
          record
            ?.withholdingTaxRate ??
          5
        ),

      announcementDate:
        dateInputValue(
          record?.announcementDate
        ),

      exDividendDate:
        dateInputValue(
          record?.exDividendDate
        ),

      recordDate:
        dateInputValue(
          record?.recordDate
        ),

      paymentDate:
        dateInputValue(
          record?.paymentDate
        ),

      financialYear:
        String(
          record?.financialYear ||
          selectedYear
        ),

      status:
        record?.status ||
        "ANNOUNCED",

      confidence:
        record?.confidence ||
        "CONFIRMED",

      source:
        record?.source ||
        "MANUAL_ENTRY",

      notes:
        record?.notes ||
        ""
    });

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
            holding?.symbol ||
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
  }

  async function handleSave() {
    const symbol =
      String(
        form?.symbol ||
        ""
      )
        .trim()
        .toUpperCase();

    const dividendPerShare =
      Number(
        form
          ?.dividendPerShare ||
        0
      );

    const withholdingTaxRate =
      Number(
        form
          ?.withholdingTaxRate ||
        0
      );

    if (!symbol) {
      showMessage(
        "Dividend Record",
        "Select or enter a security symbol."
      );

      return;
    }

    if (
      dividendPerShare <=
      0
    ) {
      showMessage(
        "Dividend Record",
        "Dividend per share must be greater than zero."
      );

      return;
    }

    if (
      withholdingTaxRate <
        0 ||
      withholdingTaxRate >
        100
    ) {
      showMessage(
        "Dividend Record",
        "Withholding tax must be between 0 and 100."
      );

      return;
    }

    const dateFields = [
      {
        label:
          "Announcement date",
        value:
          form?.announcementDate
      },
      {
        label:
          "Ex-dividend date",
        value:
          form?.exDividendDate
      },
      {
        label:
          "Record date",
        value:
          form?.recordDate
      },
      {
        label:
          "Payment date",
        value:
          form?.paymentDate
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

    if (invalidDate) {
      showMessage(
        "Dividend Record",
        `${invalidDate.label} must use YYYY-MM-DD format.`
      );

      return;
    }

    try {
      setSaving(true);

      await saveDividendRecord({
        id:
          editingId ||
          undefined,

        symbol,

        companyName:
          form?.companyName ||
          symbol,

        sector:
          form?.sector ||
          null,

        dividendType:
          String(
            form?.dividendType ||
            "FINAL"
          )
            .trim()
            .toUpperCase(),

        dividendPerShare,

        withholdingTaxRate,

        announcementDate:
          toIsoDate(
            form?.announcementDate
          ),

        exDividendDate:
          toIsoDate(
            form?.exDividendDate
          ),

        recordDate:
          toIsoDate(
            form?.recordDate
          ),

        paymentDate:
          toIsoDate(
            form?.paymentDate
          ),

        financialYear:
          form?.financialYear ||
          String(
            selectedYear
          ),

        status:
          String(
            form?.status ||
            "ANNOUNCED"
          )
            .trim()
            .toUpperCase(),

        confidence:
          String(
            form?.confidence ||
            "CONFIRMED"
          )
            .trim()
            .toUpperCase(),

        source:
          form?.source ||
          "MANUAL_ENTRY",

        notes:
          form?.notes ||
          null
      });

      setModalVisible(false);

      await loadData();

      showMessage(
        "Dividend Center",
        editingId
          ? "Dividend record updated."
          : "Dividend record added."
      );
    } catch (saveError) {
      console.error(
        "Unable to save dividend record:",
        saveError
      );

      showMessage(
        "Dividend Center",
        saveError?.message ||
          "Unable to save the dividend record."
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(
    record
  ) {
    if (
      record?.status ===
      "PAID"
    ) {
      showMessage(
        "Delete Dividend",
        "A paid dividend record cannot be deleted because it is linked to the Portfolio Event Ledger."
      );

      return;
    }

    const message =
      `Delete the ${
        record?.symbol ||
        ""
      } dividend record?`;

    if (
      Platform.OS ===
      "web"
    ) {
      if (
        window.confirm(
          message
        )
      ) {
        removeRecord(
          record
        );
      }

      return;
    }

    Alert.alert(
      "Delete Dividend",
      message,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",

          onPress: () =>
            removeRecord(
              record
            )
        }
      ]
    );
  }

  async function removeRecord(
    record
  ) {
    try {
      await deleteDividendRecord(
        record.id
      );

      await loadData();
    } catch (deleteError) {
      showMessage(
        "Dividend Center",
        deleteError?.message ||
          "Unable to delete the dividend record."
      );
    }
  }

  function confirmReceiveDividend(
    record
  ) {
    if (!record?.id) {
      return;
    }

    if (
      record?.status ===
      "PAID"
    ) {
      showMessage(
        "Dividend Receipt",
        `This dividend has already been received.\n\nReference: ${
          record?.paymentReference ||
          "Unavailable"
        }`
      );

      return;
    }

    const holding =
      holdings.find(
        (item) =>
          String(
            item?.symbol ||
            ""
          )
            .trim()
            .toUpperCase() ===
          String(
            record?.symbol ||
            ""
          )
            .trim()
            .toUpperCase()
      );

    const quantity =
      Number(
        holding?.quantity ||
        0
      );

    const dividendPerShare =
      Number(
        record?.dividendPerShare ||
        0
      );

    const grossAmount =
      quantity *
      dividendPerShare;

    const taxAmount =
      grossAmount *
      (
        Number(
          record?.withholdingTaxRate ||
          0
        ) /
        100
      );

    const netAmount =
      grossAmount -
      taxAmount;

    const message =
      `Receive the ${
        record?.symbol ||
        ""
      } dividend?\n\n` +
      `Eligible shares: ${quantity}\n` +
      `Gross amount: KES ${money(
        grossAmount
      )}\n` +
      `Estimated tax: KES ${money(
        taxAmount
      )}\n` +
      `Net cash credit: KES ${money(
        netAmount
      )}`;

    if (
      Platform.OS ===
      "web"
    ) {
      if (
        window.confirm(
          message
        )
      ) {
        processDividendReceipt(
          record
        );
      }

      return;
    }

    Alert.alert(
      "Receive Dividend",
      message,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Receive",

          onPress: () =>
            processDividendReceipt(
              record
            )
        }
      ]
    );
  }

  async function processDividendReceipt(
    record
  ) {
    try {
      setReceivingId(
        record.id
      );

      setError("");

      const result =
        await receiveDividend({
          recordId:
            record.id,

          receivedBy:
            "CURRENT_USER"
        });

      const receipt =
        result?.receipt ||
        {};

      const paymentReference =
        receipt
          ?.paymentReference ||
        result
          ?.dividend
          ?.paymentReference ||
        result
          ?.portfolioEvent
          ?.reference ||
        "Unavailable";

      let message;

      if (
        result?.status ===
        "RECEIVED"
      ) {
        message =
          `${
            record?.symbol ||
            ""
          } dividend received successfully.\n\n` +
          `Gross amount: KES ${money(
            receipt?.grossAmount
          )}\n` +
          `Tax deducted: KES ${money(
            receipt?.taxAmount
          )}\n` +
          `Net cash credited: KES ${money(
            receipt?.netAmount
          )}\n` +
          `Cash before: KES ${money(
            receipt?.cashBefore
          )}\n` +
          `Cash after: KES ${money(
            receipt?.cashAfter
          )}\n\n` +
          `Reference: ${paymentReference}`;
      } else {
        message =
          `This dividend was already recorded.\n\n` +
          `Reference: ${paymentReference}`;
      }

      showMessage(
        "Dividend Receipt",
        message
      );

      await loadData();
    } catch (receiptError) {
      console.error(
        "Unable to receive dividend:",
        receiptError
      );

      showMessage(
        "Dividend Receipt",
        receiptError?.message ||
          "Unable to receive this dividend."
      );
    } finally {
      setReceivingId(
        null
      );
    }
  }

  if (loading) {
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
          Calculating dividend forecast...
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
          PC-017
        </Text>

        <Text
          style={
            styles.title
          }
        >
          Dividend Center
        </Text>

        <Text
          style={
            styles.subtitle
          }
        >
          Track announced dividends, estimate
          portfolio income, and record received
          dividends in the Portfolio Event Ledger.
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
            Dividend forecasts are based on the
            current Practice Portfolio and saved
            declarations. A dividend affects cash
            only after it is explicitly received.
          </Text>
        </View>

        <View
          style={
            styles.yearRow
          }
        >
          <Pressable
            style={
              styles.yearButton
            }
            onPress={() =>
              setSelectedYear(
                (year) =>
                  year - 1
              )
            }
          >
            <Text
              style={
                styles.yearButtonText
              }
            >
              ‹
            </Text>
          </Pressable>

          <View
            style={
              styles.yearCard
            }
          >
            <Text
              style={
                styles.yearLabel
              }
            >
              Forecast Year
            </Text>

            <Text
              style={
                styles.yearValue
              }
            >
              {selectedYear}
            </Text>
          </View>

          <Pressable
            style={
              styles.yearButton
            }
            onPress={() =>
              setSelectedYear(
                (year) =>
                  year + 1
              )
            }
          >
            <Text
              style={
                styles.yearButtonText
              }
            >
              ›
            </Text>
          </Pressable>
        </View>

        <View
          style={
            styles.metricGrid
          }
        >
          <Metric
            label="Gross Annual"
            value={`KES ${money(
              summary
                ?.grossAnnualIncome
            )}`}
          />

          <Metric
            label="Estimated Tax"
            value={`KES ${money(
              summary
                ?.estimatedAnnualTax
            )}`}
          />

          <Metric
            label="Net Annual"
            value={`KES ${money(
              summary
                ?.netAnnualIncome
            )}`}
          />

          <Metric
            label="Monthly Average"
            value={`KES ${money(
              summary
                ?.monthlyAverage
            )}`}
          />

          <Metric
            label="Dividend Events"
            value={
              summary
                ?.dividendEvents ||
              0
            }
          />

          <Metric
            label="Portfolio Yield"
            value={`${Number(
              summary
                ?.portfolioDividendYield ||
              0
            ).toFixed(2)}%`}
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
            Add Dividend Declaration
          </Text>
        </Pressable>

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Dividend Forecast
          </Text>

          <Text
            style={
              styles.sectionIntro
            }
          >
            Expected income for holdings currently
            in the Practice Portfolio.
          </Text>

          {forecast
            ?.items
            ?.length ? (
            forecast.items.map(
              (item) => (
                <ForecastCard
                  key={
                    item.id
                  }
                  item={
                    item
                  }
                />
              )
            )
          ) : (
            <EmptyState
              title="No Forecast Available"
              message={`Add a dividend declaration with a ${selectedYear} payment date for one of your current holdings.`}
            />
          )}
        </View>

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Upcoming Payments
          </Text>

          <Text
            style={
              styles.sectionIntro
            }
          >
            Announced dividends whose payment dates
            have not yet passed.
          </Text>

          {upcomingRecords.length ? (
            upcomingRecords.map(
              (record) => (
                <DividendRecordCard
                  key={
                    record.id
                  }
                  record={
                    record
                  }
                  receiving={
                    receivingId ===
                    record.id
                  }
                  onReceive={() =>
                    confirmReceiveDividend(
                      record
                    )
                  }
                  onEdit={() =>
                    openEdit(
                      record
                    )
                  }
                  onDelete={() =>
                    confirmDelete(
                      record
                    )
                  }
                />
              )
            )
          ) : (
            <EmptyState
              title="No Upcoming Payments"
              message="No future unpaid dividend payment dates are currently recorded."
            />
          )}
        </View>

        <View
          style={
            styles.section
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            All Dividend Records
          </Text>

          {records.length ? (
            [...records]
              .sort(
                (a, b) =>
                  new Date(
                    b?.paidAt ||
                    b?.paymentDate ||
                    b?.createdAt ||
                    0
                  ).getTime() -
                  new Date(
                    a?.paidAt ||
                    a?.paymentDate ||
                    a?.createdAt ||
                    0
                  ).getTime()
              )
              .map(
                (record) => (
                  <DividendRecordCard
                    key={
                      record.id
                    }
                    record={
                      record
                    }
                    receiving={
                      receivingId ===
                      record.id
                    }
                    onReceive={() =>
                      confirmReceiveDividend(
                        record
                      )
                    }
                    onEdit={() =>
                      openEdit(
                        record
                      )
                    }
                    onDelete={() =>
                      confirmDelete(
                        record
                      )
                    }
                  />
                )
              )
          ) : (
            <EmptyState
              title="No Dividend Records"
              message="Add the first dividend declaration to begin forecasting income."
            />
          )}
        </View>

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
            Controlled Cash Posting
          </Text>

          <Text
            style={
              styles.protectionText
            }
          >
            A declaration does not increase cash.
            Receiving a dividend credits only the
            net amount after withholding tax and
            records one immutable ledger event.
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
            Refresh Dividend Center
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
              PC-017
            </Text>

            <Text
              style={
                styles.modalTitle
              }
            >
              {editingId
                ? "Edit Dividend"
                : "Add Dividend"}
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
                    (holding) => (
                      <Pressable
                        key={
                          holding.symbol
                        }
                        style={[
                          styles.holdingChip,

                          String(
                            form?.symbol ||
                            ""
                          ).toUpperCase() ===
                            String(
                              holding
                                ?.symbol ||
                              ""
                            ).toUpperCase() &&
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

            <Field
              label="Symbol"
              value={
                form.symbol
              }
              onChangeText={(
                value
              ) =>
                setForm({
                  ...form,

                  symbol:
                    value
                })
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
                setForm({
                  ...form,

                  companyName:
                    value
                })
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
                setForm({
                  ...form,

                  sector:
                    value
                })
              }
            />

            <Field
              label="Dividend Type"
              value={
                form.dividendType
              }
              placeholder="FINAL, INTERIM, SPECIAL"
              onChangeText={(
                value
              ) =>
                setForm({
                  ...form,

                  dividendType:
                    value
                      .trim()
                      .toUpperCase()
                })
              }
            />

            <Field
              label="Dividend Per Share"
              value={
                form
                  .dividendPerShare
              }
              keyboardType="decimal-pad"
              onChangeText={(
                value
              ) =>
                setForm({
                  ...form,

                  dividendPerShare:
                    value
                })
              }
            />

            <Field
              label="Withholding Tax %"
              value={
                form
                  .withholdingTaxRate
              }
              keyboardType="decimal-pad"
              onChangeText={(
                value
              ) =>
                setForm({
                  ...form,

                  withholdingTaxRate:
                    value
                })
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
                setForm({
                  ...form,

                  announcementDate:
                    value
                })
              }
            />

            <Field
              label="Ex-Dividend Date"
              value={
                form
                  .exDividendDate
              }
              placeholder="YYYY-MM-DD"
              onChangeText={(
                value
              ) =>
                setForm({
                  ...form,

                  exDividendDate:
                    value
                })
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
                setForm({
                  ...form,

                  recordDate:
                    value
                })
              }
            />

            <Field
              label="Payment Date"
              value={
                form.paymentDate
              }
              placeholder="YYYY-MM-DD"
              onChangeText={(
                value
              ) =>
                setForm({
                  ...form,

                  paymentDate:
                    value
                })
              }
            />

            <Field
              label="Financial Year"
              value={
                form.financialYear
              }
              onChangeText={(
                value
              ) =>
                setForm({
                  ...form,

                  financialYear:
                    value
                })
              }
            />

            <Field
              label="Status"
              value={
                form.status
              }
              placeholder="ANNOUNCED"
              onChangeText={(
                value
              ) =>
                setForm({
                  ...form,

                  status:
                    value
                      .trim()
                      .toUpperCase()
                })
              }
            />

            <Field
              label="Confidence"
              value={
                form.confidence
              }
              placeholder="CONFIRMED or ESTIMATED"
              onChangeText={(
                value
              ) =>
                setForm({
                  ...form,

                  confidence:
                    value
                      .trim()
                      .toUpperCase()
                })
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
                setForm({
                  ...form,

                  source:
                    value
                })
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
                setForm({
                  ...form,

                  notes:
                    value
                })
              }
            />

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
                  Save Dividend Record
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

function ForecastCard({
  item
}) {
  return (
    <View
      style={
        styles.forecastCard
      }
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
            {item.symbol}
          </Text>

          <Text
            style={
              styles.companyName
            }
          >
            {item.companyName}
          </Text>
        </View>

        <Text
          style={
            styles.recordStatus
          }
        >
          {item.status}
        </Text>
      </View>

      <Row
        label="Quantity"
        value={
          item.quantity
        }
      />

      <Row
        label="Dividend / Share"
        value={`KES ${money(
          item.dividendPerShare
        )}`}
      />

      <Row
        label="Gross Income"
        value={`KES ${money(
          item.grossExpectedIncome
        )}`}
        highlight
      />

      <Row
        label="Estimated Tax"
        value={`KES ${money(
          item.estimatedTax
        )}`}
      />

      <Row
        label="Net Income"
        value={`KES ${money(
          item.netExpectedIncome
        )}`}
        highlight
      />

      <Row
        label="Forward Yield"
        value={`${Number(
          item.forwardYield ||
          0
        ).toFixed(2)}%`}
      />

      <Row
        label="Yield on Cost"
        value={`${Number(
          item.yieldOnCost ||
          0
        ).toFixed(2)}%`}
      />

      <Row
        label="Payment Date"
        value={
          formatDate(
            item.paymentDate
          )
        }
      />
    </View>
  );
}

function DividendRecordCard({
  record,
  receiving,
  onReceive,
  onEdit,
  onDelete
}) {
  const isPaid =
    record?.status ===
    "PAID";

  return (
    <View
      style={[
        styles.recordCard,

        isPaid &&
          styles.paidRecordCard
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
            {record.symbol}
          </Text>

          <Text
            style={
              styles.companyName
            }
          >
            {
              record.companyName
            }
          </Text>
        </View>

        <Text
          style={[
            styles.recordStatus,

            isPaid &&
              styles.paidStatus
          ]}
        >
          {record.status}
        </Text>
      </View>

      <Row
        label="Type"
        value={
          record.dividendType
        }
      />

      <Row
        label="Dividend / Share"
        value={`KES ${money(
          record
            .dividendPerShare
        )}`}
      />

      <Row
        label="Net / Share"
        value={`KES ${money(
          record
            .netDividendPerShare
        )}`}
      />

      <Row
        label="Withholding Tax"
        value={`${Number(
          record
            .withholdingTaxRate ||
          0
        ).toFixed(2)}%`}
      />

      <Row
        label="Ex-Dividend"
        value={
          formatDate(
            record
              .exDividendDate
          )
        }
      />

      <Row
        label="Payment Date"
        value={
          formatDate(
            record
              .paymentDate
          )
        }
      />

      {isPaid ? (
        <>
          <Row
            label="Entitlement Qty"
            value={
              record
                ?.entitlementQuantity ||
              0
            }
          />

          <Row
            label="Gross Received"
            value={`KES ${money(
              record?.grossAmount
            )}`}
          />

          <Row
            label="Tax Deducted"
            value={`KES ${money(
              record?.taxAmount
            )}`}
          />

          <Row
            label="Net Received"
            value={`KES ${money(
              record?.netAmount
            )}`}
            highlight
          />

          <Row
            label="Paid At"
            value={
              formatDateTime(
                record?.paidAt
              )
            }
          />

          <Row
            label="Reference"
            value={
              record
                ?.paymentReference ||
              "Unavailable"
            }
          />
        </>
      ) : null}

      {!isPaid ? (
        <Pressable
          disabled={
            receiving
          }
          style={[
            styles.receiveButton,

            receiving &&
              styles.buttonDisabled
          ]}
          onPress={
            onReceive
          }
        >
          {receiving ? (
            <ActivityIndicator
              color="white"
            />
          ) : (
            <Text
              style={
                styles.receiveButtonText
              }
            >
              Receive Dividend
            </Text>
          )}
        </Pressable>
      ) : (
        <View
          style={
            styles.receivedBadge
          }
        >
          <Text
            style={
              styles.receivedBadgeText
            }
          >
            Dividend Received
          </Text>
        </View>
      )}

      <View
        style={
          styles.recordButtonRow
        }
      >
        <Pressable
          style={
            styles.editButton
          }
          onPress={
            onEdit
          }
        >
          <Text
            style={
              styles.editButtonText
            }
          >
            Edit
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.deleteButton,

            isPaid &&
              styles.disabledDeleteButton
          ]}
          onPress={
            onDelete
          }
        >
          <Text
            style={
              styles.deleteButtonText
            }
          >
            Delete
          </Text>
        </Pressable>
      </View>
    </View>
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
  if (!value) {
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
  if (!value) {
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
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      String(
        value ||
        ""
      )
    )
  ) {
    return false;
  }

  const date =
    new Date(
      `${value}T12:00:00`
    );

  return !Number.isNaN(
    date.getTime()
  );
}

function formatDate(
  value
) {
  if (!value) {
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
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
}

function formatDateTime(
  value
) {
  if (!value) {
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

function money(
  value
) {
  return Number(
    value ||
    0
  ).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
      flex: 1,
      backgroundColor:
        "#020617"
    },

    content: {
      padding: 22,
      paddingTop: 70,
      paddingBottom: 110
    },

    centerScreen: {
      flex: 1,
      backgroundColor:
        "#020617",
      alignItems:
        "center",
      justifyContent:
        "center",
      padding: 24
    },

    loadingText: {
      color: "#94a3b8",
      marginTop: 14
    },

    eyebrow: {
      color: "#c084fc",
      fontSize: 13,
      fontWeight: "900"
    },

    title: {
      color: "white",
      fontSize: 31,
      fontWeight: "900",
      marginTop: 8
    },

    subtitle: {
      color: "#94a3b8",
      lineHeight: 22,
      marginTop: 10,
      marginBottom: 20
    },

    coachCard: {
      backgroundColor:
        "rgba(147,51,234,.12)",
      borderColor:
        "rgba(147,51,234,.35)",
      borderWidth: 1,
      borderRadius: 20,
      padding: 18
    },

    coachLabel: {
      color: "#c084fc",
      fontWeight: "900"
    },

    coachText: {
      color: "white",
      lineHeight: 22,
      marginTop: 8
    },

    yearRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 18
    },

    yearButton: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor:
        "#1e293b",
      alignItems: "center",
      justifyContent:
        "center"
    },

    yearButtonText: {
      color: "#67e8f9",
      fontSize: 27,
      fontWeight: "900"
    },

    yearCard: {
      flex: 1,
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      alignItems: "center"
    },

    yearLabel: {
      color: "#94a3b8",
      fontSize: 11
    },

    yearValue: {
      color: "white",
      fontSize: 20,
      fontWeight: "900",
      marginTop: 4
    },

    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 18
    },

    metric: {
      width: "47%",
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 17,
      padding: 14
    },

    metricLabel: {
      color: "#94a3b8",
      fontSize: 11
    },

    metricValue: {
      color: "white",
      fontWeight: "900",
      marginTop: 6
    },

    primaryButton: {
      backgroundColor:
        "#9333ea",
      padding: 17,
      borderRadius: 17,
      marginTop: 20
    },

    primaryButtonText: {
      color: "white",
      fontWeight: "900",
      textAlign: "center"
    },

    section: {
      backgroundColor:
        "#0f172a",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 20,
      padding: 17,
      marginTop: 20
    },

    sectionTitle: {
      color: "#67e8f9",
      fontSize: 19,
      fontWeight: "900"
    },

    sectionIntro: {
      color: "#94a3b8",
      lineHeight: 21,
      marginTop: 7,
      marginBottom: 5
    },

    forecastCard: {
      backgroundColor:
        "#020617",
      borderColor:
        "rgba(34,197,94,.30)",
      borderWidth: 1,
      borderRadius: 16,
      padding: 15,
      marginTop: 14
    },

    recordCard: {
      backgroundColor:
        "#020617",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 16,
      padding: 15,
      marginTop: 14
    },

    paidRecordCard: {
      borderColor:
        "rgba(34,197,94,.45)"
    },

    cardHeader: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      justifyContent:
        "space-between",
      gap: 14
    },

    symbol: {
      color: "#67e8f9",
      fontSize: 22,
      fontWeight: "900"
    },

    companyName: {
      color: "#cbd5e1",
      marginTop: 3
    },

    recordStatus: {
      color: "#fde68a",
      fontSize: 11,
      fontWeight: "900"
    },

    paidStatus: {
      color: "#86efac"
    },

    row: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 14,
      marginTop: 10
    },

    rowLabel: {
      color: "#94a3b8",
      flex: 1
    },

    rowValue: {
      color: "white",
      fontWeight: "900",
      textAlign: "right",
      flex: 1
    },

    rowHighlight: {
      color: "#86efac"
    },

    receiveButton: {
      backgroundColor:
        "#16a34a",
      padding: 14,
      borderRadius: 13,
      marginTop: 15
    },

    receiveButtonText: {
      color: "white",
      textAlign: "center",
      fontWeight: "900"
    },

    receivedBadge: {
      backgroundColor:
        "rgba(34,197,94,.12)",
      borderColor:
        "rgba(34,197,94,.35)",
      borderWidth: 1,
      borderRadius: 13,
      padding: 13,
      marginTop: 15
    },

    receivedBadgeText: {
      color: "#86efac",
      textAlign: "center",
      fontWeight: "900"
    },

    recordButtonRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 15
    },

    editButton: {
      flex: 1,
      backgroundColor:
        "#1e293b",
      padding: 12,
      borderRadius: 12
    },

    editButtonText: {
      color: "#67e8f9",
      textAlign: "center",
      fontWeight: "900"
    },

    deleteButton: {
      flex: 1,
      backgroundColor:
        "rgba(239,68,68,.10)",
      borderColor:
        "rgba(239,68,68,.35)",
      borderWidth: 1,
      padding: 12,
      borderRadius: 12
    },

    disabledDeleteButton: {
      opacity: 0.5
    },

    deleteButtonText: {
      color: "#fca5a5",
      textAlign: "center",
      fontWeight: "900"
    },

    emptyCard: {
      backgroundColor:
        "#020617",
      borderColor:
        "#1e293b",
      borderWidth: 1,
      borderRadius: 15,
      padding: 15,
      marginTop: 14
    },

    emptyTitle: {
      color: "#67e8f9",
      fontWeight: "900"
    },

    emptyText: {
      color: "#94a3b8",
      lineHeight: 20,
      marginTop: 7
    },

    protectionCard: {
      backgroundColor:
        "rgba(245,158,11,.10)",
      borderColor:
        "rgba(245,158,11,.35)",
      borderWidth: 1,
      borderRadius: 18,
      padding: 17,
      marginTop: 20
    },

    protectionTitle: {
      color: "#fde68a",
      fontWeight: "900"
    },

    protectionText: {
      color: "#fef3c7",
      lineHeight: 21,
      marginTop: 7
    },

    secondaryButton: {
      backgroundColor:
        "#1e293b",
      padding: 16,
      borderRadius: 17,
      marginTop: 12
    },

    secondaryButtonText: {
      color: "#67e8f9",
      textAlign: "center",
      fontWeight: "900"
    },

    errorCard: {
      backgroundColor:
        "rgba(239,68,68,.10)",
      borderColor:
        "rgba(239,68,68,.35)",
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      marginBottom: 15
    },

    errorText: {
      color: "#fca5a5"
    },

    modalOverlay: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,.78)",
      justifyContent:
        "center",
      padding: 16
    },

    modal: {
      maxHeight: "94%",
      backgroundColor:
        "#020617",
      borderColor:
        "#334155",
      borderWidth: 1,
      borderRadius: 22
    },

    modalContent: {
      padding: 18,
      paddingBottom: 34
    },

    modalEyebrow: {
      color: "#c084fc",
      fontWeight: "900"
    },

    modalTitle: {
      color: "white",
      fontSize: 26,
      fontWeight: "900",
      marginTop: 7
    },

    holdingPicker: {
      marginTop: 18
    },

    holdingPickerRow: {
      gap: 8,
      paddingVertical: 8
    },

    holdingChip: {
      backgroundColor:
        "#1e293b",
      borderRadius: 13,
      paddingHorizontal: 14,
      paddingVertical: 10
    },

    holdingChipActive: {
      backgroundColor:
        "#9333ea"
    },

    holdingChipText: {
      color: "white",
      fontWeight: "900"
    },

    field: {
      marginTop: 14
    },

    inputLabel: {
      color: "#94a3b8",
      fontSize: 12
    },

    input: {
      marginTop: 7,
      backgroundColor:
        "#0f172a",
      borderColor:
        "#334155",
      borderWidth: 1,
      borderRadius: 13,
      padding: 14,
      color: "white"
    },

    multilineInput: {
      minHeight: 90,
      textAlignVertical:
        "top"
    },

    modalPrimaryButton: {
      backgroundColor:
        "#9333ea",
      padding: 17,
      borderRadius: 16,
      marginTop: 22
    },

    modalPrimaryButtonText: {
      color: "white",
      textAlign: "center",
      fontWeight: "900"
    },

    modalSecondaryButton: {
      backgroundColor:
        "#1e293b",
      padding: 15,
      borderRadius: 16,
      marginTop: 11
    },

    modalSecondaryButtonText: {
      color: "#67e8f9",
      textAlign: "center",
      fontWeight: "900"
    },

    buttonDisabled: {
      opacity: 0.6
    }
  });