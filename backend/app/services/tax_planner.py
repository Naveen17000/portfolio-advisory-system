"""Indian tax planning and 80C optimization."""
import logging

logger = logging.getLogger("portfolio_api")

SECTION_80C_LIMIT = 150000
SECTION_80D_LIMIT_SELF = 25000
SECTION_80D_LIMIT_PARENTS = 50000
LTCG_EXEMPTION = 125000

TAX_SLABS_NEW = [
    (0, 300000, 0),
    (300000, 700000, 5),
    (700000, 1000000, 10),
    (1000000, 1200000, 15),
    (1200000, 1500000, 20),
    (1500000, float("inf"), 30),
]

TAX_SAVING_INSTRUMENTS = [
    {"name": "ELSS Mutual Funds", "section": "80C", "lock_in": "3 years", "expected_return": "12-15%", "risk": "High", "liquidity": "Low (3yr lock-in)"},
    {"name": "PPF", "section": "80C", "lock_in": "15 years", "expected_return": "7.1%", "risk": "Zero", "liquidity": "Low"},
    {"name": "NPS Tier-I", "section": "80CCD(1B)", "lock_in": "Till 60", "expected_return": "9-12%", "risk": "Medium", "liquidity": "Very Low"},
    {"name": "Tax Saver FD", "section": "80C", "lock_in": "5 years", "expected_return": "6.5-7%", "risk": "Zero", "liquidity": "Low"},
    {"name": "SCSS", "section": "80C", "lock_in": "5 years", "expected_return": "8.2%", "risk": "Zero", "liquidity": "Low"},
    {"name": "Life Insurance", "section": "80C", "lock_in": "Varies", "expected_return": "4-6%", "risk": "Low", "liquidity": "Low"},
    {"name": "Health Insurance", "section": "80D", "lock_in": "Annual", "expected_return": "N/A", "risk": "N/A", "liquidity": "N/A"},
    {"name": "Home Loan Principal", "section": "80C", "lock_in": "N/A", "expected_return": "N/A", "risk": "N/A", "liquidity": "N/A"},
]


def compute_tax(annual_income: float, deductions_80c: float = 0, deductions_80d: float = 0, nps_80ccd: float = 0) -> dict:
    """Compute tax under new regime with deductions."""
    standard_deduction = 75000
    taxable = max(0, annual_income - standard_deduction - min(deductions_80c, SECTION_80C_LIMIT) - min(deductions_80d, SECTION_80D_LIMIT_SELF + SECTION_80D_LIMIT_PARENTS) - min(nps_80ccd, 50000))

    tax = 0
    slab_breakdown = []
    for lower, upper, rate in TAX_SLABS_NEW:
        if taxable <= lower:
            break
        slab_income = min(taxable, upper) - lower
        slab_tax = slab_income * rate / 100
        tax += slab_tax
        if slab_income > 0:
            slab_breakdown.append({
                "slab": f"Rs. {lower:,.0f} - Rs. {upper:,.0f}" if upper != float("inf") else f"Above Rs. {lower:,.0f}",
                "rate": f"{rate}%",
                "taxable_amount": round(slab_income),
                "tax": round(slab_tax),
            })

    cess = tax * 0.04
    total_tax = tax + cess
    effective_rate = (total_tax / annual_income * 100) if annual_income > 0 else 0

    return {
        "annual_income": annual_income,
        "standard_deduction": standard_deduction,
        "section_80c_used": min(deductions_80c, SECTION_80C_LIMIT),
        "section_80c_remaining": max(0, SECTION_80C_LIMIT - deductions_80c),
        "section_80d_used": min(deductions_80d, SECTION_80D_LIMIT_SELF + SECTION_80D_LIMIT_PARENTS),
        "nps_80ccd_used": min(nps_80ccd, 50000),
        "taxable_income": round(taxable),
        "tax_before_cess": round(tax),
        "cess_4pct": round(cess),
        "total_tax": round(total_tax),
        "effective_rate_pct": round(effective_rate, 2),
        "slab_breakdown": slab_breakdown,
        "tax_saving_instruments": TAX_SAVING_INSTRUMENTS,
        "potential_savings": round(min(deductions_80c, SECTION_80C_LIMIT) * 0.30) if deductions_80c > 0 else round(SECTION_80C_LIMIT * 0.30),
    }
