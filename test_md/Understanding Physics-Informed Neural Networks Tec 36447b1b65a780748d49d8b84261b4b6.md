# Understanding Physics-Informed Neural Networks: Techniques, Applications, Trends, and Challenges

[Understanding Physics-Informed Neural Networks: Techniques, Applications, Trends, and Challenges](https://www.mdpi.com/2932770)

# PINNs vs. Purely Data-Driven Neural Networks: A Comprehensive Q&A

---

## Foundational Differences

### What is the core conceptual difference between a standard data-driven neural network and a PINN?

A standard neural network relies **solely on data** to learn representations — it adjusts weights to minimize error between predicted and actual outputs in a dataset. It has no inherent understanding of physical principles and may produce physically inconsistent results, especially when data is scarce or noisy.

A PINN, by contrast, **embeds the governing equations of the physical system** directly into the neural network's architecture or loss function:

> "The core idea behind PINNs is to embed the governing equations of the physical system into the neural network's architecture or loss function... By doing so, PINNs ensure that the learned solutions not only fit the data but also adhere to the physical constraints imposed by the PDEs."
> 

[Core Concept](https://alphaxiv.org/abs/2408.09451?page=2)

This means the PINN loss function contains at minimum two terms: one for data fidelity and one enforcing physics residuals.

---

### How does the loss function of a PINN structurally differ from that of a purely data-driven neural network?

In a standard neural network for regression, the cost function is simply the Mean Squared Error (MSE):

$$
J(W, b) = \frac{1}{m} \sum_{i=1}^{m} (y_i - \hat{y}_i)^2
$$

where $m$ is the number of training examples, $y_i$ is the true output, and $\hat{y}_i$ is the predicted output. [Standard Loss](https://alphaxiv.org/abs/2408.09451?page=4)

In a PINN, the cost function is **augmented** with physics-based terms. The total loss is:

$$
L_{\text{total}} = L_{\text{data}} + L_{\text{physics}}
$$

Where:

- $L_{\text{data}}$ = data fidelity term (same MSE as above)
- $L_{\text{physics}}$ = residual of the governing PDE/ODE evaluated at collocation points

The paper states that the cost function may include:

1. **Data fidelity + physics regularization** terms that penalize deviations from known physical laws
2. **Physical constraints** based on conservation laws as equality/inequality constraints on the network output
3. A **regularization term** to enforce physical consistency and penalize deviations from physical laws

[Physics Loss Components](https://alphaxiv.org/abs/2408.09451?page=8)

---

### What is the role of PDE/ODE residuals in PINN training that has no analog in purely data-driven NNs?

In a PINN, after the neural network produces an output $\hat{y}$, automatic differentiation is used to compute its partial derivatives with respect to inputs (space $\vec{x}$ and time $t$). These derivatives are substituted into the governing differential equation to compute a **residual**:

$$
f = \mathcal{N}(\hat{y}) \approx 0
$$

where $\mathcal{N}$ is the differential operator (e.g., the Navier-Stokes or heat equation). This residual is then fed back as a loss component, as illustrated in the paper's Figure 2:

> "The process depicted involves integrating the residuals of the differential equations (DEs) with dynamics N() into the loss function to improve the accuracy of the neural network (NN) model."
> 

[DE Residual](https://alphaxiv.org/abs/2408.09451?page=10)

A purely data-driven NN has **no such residual term** — it has no mechanism to enforce that the output satisfies any differential equation. The network is free to produce any smooth function that fits training data, even if physically nonsensical.

---

### Why do purely data-driven NNs fail when physical systems are involved, and what specific problem does PINN solve?

Data-driven NNs fail in physics-governed problems for three key reasons identified in the paper:

1. **Data scarcity**: Many scientific experiments produce limited labeled data. A pure NN needs large datasets to generalize, but physical experiments are expensive.
2. **No enforcement of physical constraints**: A standard NN trained on a few fluid dynamics measurements may produce velocity fields that violate mass conservation (e.g., $\nabla \cdot \mathbf{u} \neq 0$).
3. **Physically inconsistent extrapolation**: Outside the training distribution, a data-driven NN extrapolates arbitrarily, while a PINN is constrained to follow physical laws even in unseen regions.

> "Traditional NNs do not inherently understand these physical principles but rely solely on data to learn accurate representations, and for this reason may produce physically inconsistent results. This limitation is particularly pronounced in scenarios where data are scarce or noisy."
> 

[NN Limitation](https://alphaxiv.org/abs/2408.09451?page=2)

PINNs solve this by **reducing dependency on large datasets** — physical laws provide *a priori* knowledge that guides learning even where data is absent.

---

## Prior Knowledge Integration

### Through what three distinct mechanisms can prior physical knowledge be integrated into a PINN, and how does each differ from a standard NN?

The paper identifies three integration pathways, none of which exist in purely data-driven NNs:

**1. Feature Engineering**
Physics-derived features (e.g., velocity, pressure, temperature) are added as inputs. For instance, in fluid dynamics, simulations or governing equations generate additional features that enhance learning. A standard NN only uses raw observed data as features.

**2. Model Construction**
The neural network architecture is designed to mirror physical characteristics — e.g., using CNNs for grid-structured spatial data, GNNs for graph-structured systems, or RNNs for temporal ODEs. In a pure data-driven NN, architecture is selected purely for representational capacity.

**3. Additional Cost/Regularization**
Physical laws are embedded as extra terms in the loss function. This is the most distinctive PINN mechanism — the network must minimize both data error and physics residuals simultaneously.

[Integration Pathways](https://alphaxiv.org/abs/2408.09451?page=3)

---

### How does the collocation method work in PINNs, and how does it enforce physics without requiring labeled data at every point?

In a purely data-driven NN, learning requires labeled pairs $(x_i, y_i)$ everywhere. In a PINN using the **Collocation Method**, the physics equation itself provides "supervision" at collocation points where no labeled output is known.

The method works as follows:

- Sample discrete collocation points $\{x_c\}$ throughout the spatial/temporal domain
- At each $x_c$, evaluate the PDE residual: $\mathcal{N}(\hat{y}(x_c)) - f(x_c) = 0$
- Add the squared residual to the loss: $L_{\text{physics}} = \frac{1}{N_c}\sum_{c=1}^{N_c} |\mathcal{N}(\hat{y}(x_c))|^2$

> "This method enforces differential equations at discrete collocation points throughout the domain. PINNs minimize the residual of the PDEs or ODEs at these points, approximating the solution while satisfying the equations."
> 

[Collocation Method](https://alphaxiv.org/abs/2408.09451?page=10)

This enables PINNs to train in **unsupervised or semi-supervised** fashion in regions where no labeled data is available.

---

## Architecture-Level Differences

### How are CNNs used differently in PINNs compared to purely data-driven CNNs?

In a purely data-driven CNN, the total loss is:

$$
L_{\text{total}} = L_{\text{std}} + \lambda L_{\text{reg}}
$$

where $L_{\text{std}}$ is data loss (e.g., cross-entropy or MSE) and $L_{\text{reg}}$ is a standard regularization term (e.g., weight decay or dropout) purely to prevent overfitting.

In a Physics-Informed CNN, the regularization term $L_{\text{reg}}$ is **replaced or augmented** with a physics-based term derived from the governing PDE. For example, in fluid dynamics, $L_{\text{reg}}$ would contain the continuity equation residual $|\nabla \cdot \mathbf{u}|^2$. This is not just statistical regularization — it is a hard physical constraint.

> "In PINNs, CNNs can be employed when the problem involves spatial or spatio-temporal dependencies."
> 

[Physics CNN](https://alphaxiv.org/abs/2408.09451?page=5)

The convolution kernels in a physics-informed CNN may also be **physics-inspired** — designed to approximate known differential operators rather than learned purely from data.

---

### How does a Physics-Informed RNN differ from a purely data-driven RNN in modeling dynamical systems?

A standard RNN updates hidden state $h_t$ and output $y_t$ as:

$$
h_t = f(W_{hh}h_{t-1} + W_{xh}x_t + b_h)
$$

$$
y_t = g(W_{hy}h_t + b_y)
$$

with cost function:

$$
J = \frac{1}{T}\sum_{t=1}^{T} \|y_t - \hat{y}_t\|^2
$$

This purely data-driven formulation learns temporal dynamics from observation sequences alone.

A Physics-Informed RNN **augments** this with ODE residuals. For a physical system governed by $\dot{u} = f(u, t)$, the additional loss term penalizes violation of this ODE at each time step:

$$
L_{\text{physics}} = \frac{1}{T}\sum_{t=1}^{T} \left\|\frac{d\hat{y}_t}{dt} - f(\hat{y}_t, t)\right\|^2
$$

This forces the RNN's trajectory $\{\hat{y}_t\}$ to be consistent with the known differential equation governing the system, not just to interpolate training observations.

> "In PINNs, RNNs can be employed for solving time-dependent problems governed by ODEs, such as predicting the behavior of dynamic systems over time."
> 

[Physics RNN](https://alphaxiv.org/abs/2408.09451?page=6)

---

### How are GNNs used in PINNs for modeling physically interconnected systems, unlike in purely data-driven settings?

In a purely data-driven GNN, the node classification loss is:

$$
J(\theta) = -\sum_{i=1}^{N}\sum_{k=1}^{K} y_{i,k} \log(\hat{y}_{i,k})
$$

where $N$ is the number of nodes and $K$ is the number of classes — purely supervised from labeled graph data.

In a Physics-Informed GNN, physical coupling equations between nodes are incorporated. For example, in a power grid or molecular dynamics simulation, the interaction forces or electrical admittances between nodes are known from physics. These constraints are encoded as additional loss terms alongside the cross-entropy loss, ensuring graph node predictions respect physical coupling laws.

> "In the context of PINNs, GNNs can be used to model complex physical systems characterized by interconnected components, such as molecular dynamics simulations or social network analysis."
> 

[Physics GNN](https://alphaxiv.org/abs/2408.09451?page=7)

---

## Inverse Problems

### How does PINN solve inverse problems in a way that is fundamentally different from data-driven approaches?

In a purely data-driven NN, the model learns a forward mapping $x \to y$. **Inverse problems** — inferring unknown inputs/parameters from observed outputs — are not naturally handled.

In a PINN, the inverse problem is formulated as an optimization where both the neural network *and* the unknown physical parameters $\lambda$ are simultaneously optimized:

$$
\min_{W, \lambda} \|y_{\text{obs}} - F(x; W, \lambda)\|^2 + \|\mathcal{N}(u; \lambda)\|^2
$$

Here:

- $F(x; W, \lambda)$ is the NN mapping with parameters $W$ and unknown physical parameter $\lambda$
- $\mathcal{N}(u; \lambda)$ is the PDE residual parameterized by the unknown $\lambda$

This allows PINNs to simultaneously reconstruct the state field *and* discover unknown parameters (e.g., viscosity in fluid dynamics, diffusion coefficients in transport equations) from sparse measurements.

> "Inverse problems occur in scientific and engineering disciplines when determining input parameters or conditions that result in specific observed behaviors or outputs. These problems are challenging because they require inferring hidden quantities from limited and noisy data."
> 

[Inverse Problem](https://alphaxiv.org/abs/2408.09451?page=11)

---

### How does Tikhonov regularization in PINNs differ from its use in purely data-driven models?

In a standard data-driven model, Tikhonov (ridge) regularization is:

$$
\min_x \|y_{\text{obs}} - F(x)\|^2 + \lambda\|\Omega(x)\|^2
$$

where $\Omega(x)$ is typically the $L_2$ norm of model weights — a purely statistical measure to prevent overfitting.

In a PINN, the regularization term $\Omega(x)$ is **physically meaningful** — it encodes prior knowledge about the physical principles governing the problem:

$$
\min_x \|y_{\text{obs}} - F(x)\|^2 + \lambda\|\mathcal{N}(x)\|^2
$$

where $\mathcal{N}(x)$ is the PDE residual. The penalty term now directly measures **physical inconsistency**, not just statistical complexity. This means even with very limited data, the solution space is constrained to physically plausible solutions.

> "In the context of PINNs, the regularization term Ω(x) could incorporate prior knowledge about the physical principles governing the problem."
> 

[Physics Regularization](https://alphaxiv.org/abs/2408.09451?page=11)

---

## Bayesian & Probabilistic Extensions

### How does the Bayesian PINN (B-PINN) extend the probabilistic capability beyond a standard Bayesian NN?

A standard Bayesian Neural Network (BNN) computes the posterior:

$$
p(\theta | D) = \frac{p(D|\theta) \cdot p(\theta)}{p(D)}
$$

where the prior $p(\theta)$ is typically a generic Gaussian over network weights — containing **no physical knowledge**.

In a **B-PINN**, the prior is physics-informed. It encodes known physical laws as constraints in the prior distribution, so:

$$
p(\theta | D) \propto p(D|\theta) \cdot p_{\text{physics}}(\theta)
$$

where $p_{\text{physics}}(\theta)$ is a prior that assigns higher probability to parameter configurations whose corresponding solutions satisfy the governing PDEs. This means:

- Predictions are **more accurate** than standard PINNs when data is noisy
- The model is **better equipped to handle significant noise** by addressing overfitting
- Uncertainty quantification reflects both data uncertainty *and* physical constraint satisfaction

> "B-PINNs leverage physical principles and noisy measurements within a Bayesian framework to provide predictions and evaluate uncertainty. Unlike PINNs, B-PINNs offer more accurate predictions and are better equipped to manage significant levels of noise by addressing overfitting."
> 

[B-PINN](https://alphaxiv.org/abs/2408.09451?page=9)

The paper notes that Hamiltonian Monte Carlo (HMC) is preferred over variational inference (VI) for posterior estimation in B-PINNs.

---

## Multi-Physics and Coupled Systems

### How does PINN handle multi-physics coupling that is completely absent in data-driven NNs?

A data-driven NN treats multi-physics problems as a black-box regression from inputs to outputs, with no knowledge of how different physical processes interact.

A PINN encodes the **coupled PDE system** directly into the loss function. For $N$ interacting physical processes, each governed by equation $f_i$, the PINN solves:

$$
\frac{\partial u_1}{\partial t} = f_1(u_1, x) + \sum_{j=2}^{N} \gamma_{1j} \cdot g_{1j}(u_j, x)
$$

$$
\frac{\partial u_2}{\partial t} = f_2(u_2, x) + \sum_{j=1}^{N} \gamma_{2j} \cdot g_{2j}(u_j, x)
$$

$$
.
$$

$$
.
$$

$$
\frac{\partial u_N}{\partial t} = f_N(u_N, x) + \sum_{j=1}^{N-1} \gamma_{Nj} \cdot g_{Nj}(u_j, x)
$$

where $\gamma_{ij}$ are physical coupling coefficients and $g_{ij}(u_j, x)$ describes the influence of process $j$ on process $i$. Each of these residuals contributes to the total PINN loss, enforcing all coupled physics simultaneously.

[Multi-Physics Coupling](https://alphaxiv.org/abs/2408.09451?page=12)

---

## Data Assimilation & Model Calibration

### How does data assimilation in PINNs go beyond what a data-driven NN can do for state estimation?

A data-driven NN learns a fixed mapping from inputs to outputs and cannot easily incorporate **streaming observational data** to update a physical model in real time.

A PINN formulates data assimilation as the optimization:

$$
x_{\text{est}} = \arg\min_x J(x)
$$

where the cost function combines two physics-aware terms:

$$
J(x) = J_{\text{data}}(x) + J_{\text{reg}}(x)
$$

$$
J_{\text{data}}(x) = \|y_{\text{obs}} - y(x)\|^2
$$

$$
J_{\text{reg}}(x) = \text{regularization\_function}(x)
$$

Here $y(x)$ is the **physics-based model prediction** (not a black-box NN output), and the regularization function encodes physical constraints. This allows the PINN to combine observational data with numerical physics models to produce **optimal estimates** of state variables that are consistent with both measurements and governing equations — something a purely data-driven NN cannot guarantee.

[Data Assimilation](https://alphaxiv.org/abs/2408.09451?page=12)

---

### How does model calibration and uncertainty quantification in PINNs incorporate physics in a way data-driven NNs do not?

In PINN-based model calibration, three components are jointly handled:

**1. Forward Model:/math**

$$
y = f(m) + e
$$

**2. Parameter Estimation:/math**

$$
y = f(m) + e
$$

**3. Uncertainty Quantification:/math**

$$
u = \mathcal{F}(m)
$$

where $\mathcal{F}(\cdot)$ quantifies uncertainty through Bayesian inference or Monte Carlo methods.

Critically, $f(m)$ here is **a physics-based forward model**, not an arbitrary NN. The PINN produces not only point estimates but **probability distributions** over the unknown parameters. Physics-based priors constrain these distributions to physically plausible regions, leading to more reliable uncertainty estimates than a data-driven NN that has no notion of physical plausibility.

[Uncertainty Quantification](https://alphaxiv.org/abs/2408.09451?page=13)

---

## Numerical Methods Integration

### How do PINNs integrate with classical numerical methods (FDM, Galerkin, BIM) differently from data-driven NNs?

Data-driven NNs operate independently of classical numerical methods — they are black-box function approximators. PINNs, by contrast, can be seen as **neural implementations of classical solvers**:

| Method | PINN Integration | Data-Driven NN |
| --- | --- | --- |
| **Finite Difference** | NN trained on grid points; derivatives approximated via finite differences within the physics loss | Not applicable |
| **Collocation** | PDE residuals minimized at discrete interior points | Not applicable |
| **Boundary Integral** | NN learns the boundary integral representation, reducing dimensionality | Not applicable |
| **Deep Galerkin** | PDE residuals minimized over the full domain in strong sense | Not applicable |
| **Time-Stepping** | NN learns time evolution consistent with the ODE/PDE at each step | Sequential NN has no physics constraint |

[Numerical Methods](https://alphaxiv.org/abs/2408.09451?page=10)

---

## DeepONet and Operator Learning

### How does DeepONet extend PINNs beyond what any data-driven NN can achieve in terms of solving families of PDEs?

A standard data-driven NN solves a **single instance** of a problem: given fixed boundary conditions and parameters, it learns one particular solution function.

A purely data-driven NN cannot generalize to new boundary conditions or source terms without retraining.

**DeepONet** (introduced in the context of PINNs) learns the **mapping between function spaces** — i.e., it learns a nonlinear operator $\mathcal{G}: u \to s$ where $u$ is an input function (e.g., initial condition) and $s$ is the corresponding solution function. It consists of:

- A **branch network** encoding the input function at sensor points
- A **trunk network** encoding the output function locations

This allows a single trained DeepONet to solve **entire families of PDEs** for any new input function, not just the single instance it was trained on:

> "The introduction of neural operators, such as DeepONet, has further extended the PINN framework by enabling the learning of mappings between function spaces, thus allowing for the solution of families of PDEs rather than individual instances."
> 

[DeepONet](https://alphaxiv.org/abs/2408.09451?page=13)

---

## Generative Model Extensions

### How do Physics-Informed GANs differ from standard GANs in the data-driven paradigm?

A standard GAN has a generator $G$ and discriminator $D$ playing a minimax game:

$$
\min_G \max_D V(D, G) = \mathbb{E}{X \sim p{\text{data}}(X)}[\log D(X)] + \mathbb{E}_{Z \sim p(Z)}[\log(1 - D(G(Z)))]
$$

The generator learns to produce realistic samples, but has **no physical constraints** — generated samples need only "look like" training data.

A **Physics-Informed GAN** adds a physics residual term to the generator's loss. The generator is penalized not only for failing to fool the discriminator, but also for producing samples that violate governing equations. This is particularly useful for:

- **Stochastic differential equations**: generating physically plausible stochastic realizations
- **Uncertainty quantification**: producing samples from the posterior distribution over PDE solutions

> "In PINNs, autoencoders or VAEs can be employed to learn compact representations of physical systems, enabling efficient modeling and simulation for tasks such as data denoising, feature extraction, or uncertainty estimation."
> 

[Generative Models](https://alphaxiv.org/abs/2408.09451?page=8)

---

## Attention Mechanisms in PINNs

### How does physics-informed attention differ from standard attention in transformer-based data-driven models?

In a standard attention mechanism (e.g., Transformer), the attention weights are:

$$
A(x) = \text{softmax}(W_a \cdot \text{ReLU}(W_x \cdot x + b_x) + b_a)
$$

producing attention-weighted input $\tilde{x} = A(x) \odot x$, and final output $y = f(\tilde{x}; \theta)$ with cost:

$$
J(\theta) = \frac{1}{N}\sum_{i=1}^{N} L(y_i, \hat{y}_i) + \lambda R(\theta)
$$

In a purely data-driven model, $R(\theta)$ is a generic regularizer and attention weights are driven purely by data patterns.

In a **Physics-Informed Attention PINN**, the attention weights are guided by the physics of the problem — they learn to focus on regions of space or time where PDE residuals are large, automatically directing the network's capacity toward physically complex regions. The regularization term $R(\theta)$ includes the PDE residual, coupling attention to physics.

> "In PINNs, attention mechanisms can enhance performance by selectively attending to relevant spatial or temporal features, particularly in problems with large or high-dimensional input spaces."
> 

[Physics Attention](https://alphaxiv.org/abs/2408.09451?page=7)

---

## Engineering Challenges Unique to PINNs

### What computational challenges arise in PINNs that do not exist in purely data-driven NNs, and how do they stem from physics integration?

Several computational challenges are **unique to or amplified in** PINNs compared to data-driven NNs:

1. **Stiff PDEs**: Many physical systems involve stiffness (e.g., multi-scale reaction-diffusion equations) where loss terms have vastly different magnitudes, causing gradient imbalance during backpropagation. Standard NNs have no such issue since they optimize a single smooth loss.
2. **Automatic differentiation overhead**: Computing PDE residuals requires differentiating the NN output with respect to input coordinates (not just weights). This is an additional forward-backward pass not present in data-driven training.
3. **Collocation point selection**: The distribution of collocation points significantly affects accuracy — too sparse in physically active regions leads to poor constraint enforcement. Data-driven NNs simply require sufficient labeled pairs.
4. **Multi-objective loss balancing**: The total loss $L_{\text{total}} = L_{\text{data}} + w_{\text{physics}} L_{\text{physics}} + w_{\text{BC}} L_{\text{BC}}$ requires careful weighting. Imbalanced weights cause the optimizer to favor one term, degrading physical consistency or data fit. Data-driven NNs optimize a single objective.

> "Numerical instabilities often arise when solving PDEs or ODEs, particularly in stiff or ill-conditioned systems, necessitating careful numerical methods and regularization techniques."
> 

[Computational Challenges](https://alphaxiv.org/abs/2408.09451?page=16)

---

### How does domain decomposition in PINNs address scalability challenges that purely data-driven NNs do not face?

Purely data-driven NNs scale by adding more training data and increasing model capacity. PINNs face a **unique scalability problem**: the physics residual must be evaluated over the entire spatial-temporal domain, which becomes prohibitively expensive for large domains or high-dimensional problems.

The PINN solution is **domain decomposition** — the physical domain is partitioned into smaller subdomains, each trained by a sub-network. This:

- Enables **parallel training** across subdomains
- Reduces the complexity of each sub-problem
- Allows larger-scale physics simulations than a single PINN could handle

Interface conditions between subdomains are enforced as additional loss terms — yet another physics-specific constraint with no analog in data-driven NNs.

> "By partitioning the physical domain into smaller subdomains, these techniques facilitate parallel training and improve scalability, making it feasible to apply PINNs to large-scale problems."
> 

[Domain Decomposition](https://alphaxiv.org/abs/2408.09451?page=13)

---

### What is the generalization and robustness advantage of PINNs over purely data-driven NNs in out-of-distribution scenarios?

In a purely data-driven NN, **out-of-distribution (OOD)** inputs — those outside the training data distribution — can produce arbitrary, physically meaningless predictions because the model has no knowledge of the governing physics.

In a PINN:

- The physics loss term acts as a **universal regularizer** across the entire domain, including regions with no training data
- Even in OOD regions, the PINN is constrained to produce outputs that satisfy the governing equations
- This physics-anchored generalization is qualitatively different from statistical generalization in data-driven models

The paper frames this as a key advantage:

> "It enhances the robustness and reliability of the models, ensuring that the predictions are physically consistent even in regions where data are sparse."
> 

[Robustness Advantage](https://alphaxiv.org/abs/2408.09451?page=2)

---

### How do PINNs enable scientific discovery (e.g., equation discovery) that is impossible for purely data-driven NNs?

A purely data-driven NN learns a black-box mapping and cannot extract interpretable physical equations. A PINN, when combined with **symbolic regression**, can discover unknown governing equations from data.

The paper cites the example of Zhang et al., who combined PINNs with symbolic regression to discover an unknown mathematical ODE model for Alzheimer's disease progression:

> "Zhang et al. proposed a strategy using PINN and symbolic regression to discover an unknown mathematical model in a system of ODEs. Though focused on Alzheimer's disease modeling, their approach shows potential for general equation discovery."
> 

[Equation Discovery](https://alphaxiv.org/abs/2408.09451?page=9)

This works because PINNs separate the **known physics structure** (e.g., reaction-diffusion form) from **unknown parameters/functional forms**, allowing the symbolic regression component to identify what's missing from the known model — a capability fundamentally beyond data-driven NNs.